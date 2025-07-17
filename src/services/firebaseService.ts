import { db, auth, storage } from "../lib/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { Project, Folder, Prompt, Tag, PromptVersion } from "../types";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  writeBatch,
} from "firebase/firestore";

// Auth functions
export const signInWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
};

export const signOut = async (): Promise<void> => {
  return firebaseSignOut(auth);
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const signUpWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const signInWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const uploadProfilePicture = async (
  userId: string,
  file: File
): Promise<string> => {
  const storageRef = ref(storage, `profile-pictures/${userId}`);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
};

export const updateUserProfile = async (
  user: User,
  displayName: string,
  photoURL?: string
): Promise<void> => {
  const profile: { displayName: string; photoURL?: string } = {
    displayName,
  };
  if (photoURL) {
    profile.photoURL = photoURL;
  }
  await updateProfile(user, profile);
};

// Project functions
export const getProjects = async (userId: string): Promise<Project[]> => {
  const projectsCol = collection(db, "projects");
  const q = query(projectsCol, where("userId", "==", userId));
  const projectSnapshot = await getDocs(q);
  const projectList = projectSnapshot.docs.map(
    (doc) => ({ ...doc.data(), id: doc.id }) as Project
  );
  return projectList;
};

export const createProject = async (
  project: Omit<Project, "id">
): Promise<Project> => {
  const docRef = await addDoc(collection(db, "projects"), project);
  return { ...project, id: docRef.id };
};

export const deleteProject = async (projectId: string): Promise<void> => {
  const batch = writeBatch(db);

  // Delete project
  const projectRef = doc(db, "projects", projectId);
  batch.delete(projectRef);

  // Find and delete folders
  const foldersQuery = query(
    collection(db, "folders"),
    where("project_id", "==", projectId)
  );
  const foldersSnapshot = await getDocs(foldersQuery);
  foldersSnapshot.forEach((doc) => batch.delete(doc.ref));

  // Find and delete prompts and their versions
  const promptsQuery = query(
    collection(db, "prompts"),
    where("project_id", "==", projectId)
  );
  const promptsSnapshot = await getDocs(promptsQuery);
  for (const promptDoc of promptsSnapshot.docs) {
    batch.delete(promptDoc.ref);
    const versionsQuery = query(
      collection(db, "prompt_versions"),
      where("prompt_id", "==", promptDoc.id)
    );
    const versionsSnapshot = await getDocs(versionsQuery);
    versionsSnapshot.forEach((doc) => batch.delete(doc.ref));
  }

  await batch.commit();
};

// Folder functions
export const getAllFolders = async (userId: string): Promise<Folder[]> => {
  const foldersCol = collection(db, "folders");
  const q = query(foldersCol, where("userId", "==", userId));
  const folderSnapshot = await getDocs(q);
  const folderList = folderSnapshot.docs.map(
    (doc) => ({ ...doc.data(), id: doc.id }) as Folder
  );
  return folderList;
};

export const getFoldersByProject = async (
  projectId: string
): Promise<Folder[]> => {
  const q = query(
    collection(db, "folders"),
    where("project_id", "==", projectId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) => ({ ...doc.data(), id: doc.id }) as Folder
  );
};

export const createFolder = async (
  folder: Omit<Folder, "id" | "is_favorite">
): Promise<Folder> => {
  const newFolder = { ...folder, is_favorite: false };
  try {
    const docRef = await addDoc(collection(db, "folders"), newFolder);
    return { ...newFolder, id: docRef.id };
  } catch (error) {
    console.error("Error creating folder in Firestore:", error);
    throw error;
  }
};

export const updateFolder = async (folder: Folder): Promise<Folder> => {
  const folderRef = doc(db, "folders", folder.id);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...folderData } = folder;
  await updateDoc(folderRef, folderData);
  return folder;
};

export const deleteFolder = async (folderId: string): Promise<void> => {
  const batch = writeBatch(db);

  const folderIdsToDelete: string[] = [folderId];
  const foldersToScan: string[] = [folderId];

  // Find all descendant folders
  while (foldersToScan.length > 0) {
    const currentFolderId = foldersToScan.shift() as string;
    const q = query(
      collection(db, "folders"),
      where("parent_folder_id", "==", currentFolderId)
    );
    const snapshot = await getDocs(q);
    snapshot.forEach((doc) => {
      folderIdsToDelete.push(doc.id);
      foldersToScan.push(doc.id);
    });
  }

  // Firestore `in` query is limited to 30 elements, so we have to batch our deletions
  for (let i = 0; i < folderIdsToDelete.length; i += 30) {
    const chunk = folderIdsToDelete.slice(i, i + 30);
    const promptsQuery = query(
      collection(db, "prompts"),
      where("folder_id", "in", chunk)
    );
    const promptsSnapshot = await getDocs(promptsQuery);

    for (const promptDoc of promptsSnapshot.docs) {
      batch.delete(promptDoc.ref);
      const versionsQuery = query(
        collection(db, "prompt_versions"),
        where("prompt_id", "==", promptDoc.id)
      );
      const versionsSnapshot = await getDocs(versionsQuery);
      versionsSnapshot.forEach((versionDoc) => batch.delete(versionDoc.ref));
    }
  }

  folderIdsToDelete.forEach((id) => {
    const folderRef = doc(db, "folders", id);
    batch.delete(folderRef);
  });

  await batch.commit();
};

// Prompt functions
export const getAllPrompts = async (userId: string): Promise<Prompt[]> => {
  const promptsCol = collection(db, "prompts");
  const q = query(promptsCol, where("userId", "==", userId));
  const promptSnapshot = await getDocs(q);
  const promptList = promptSnapshot.docs.map(
    (doc) => ({ ...doc.data(), id: doc.id }) as Prompt
  );
  return promptList;
};

export const getPromptsByProject = async (
  projectId: string
): Promise<Prompt[]> => {
  const q = query(
    collection(db, "prompts"),
    where("project_id", "==", projectId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) => ({ ...doc.data(), id: doc.id }) as Prompt
  );
};

export const createPrompt = async (
  prompt: Omit<
    Prompt,
    "id" | "created_at" | "versions" | "current_version_id"
  > & { content: string },
  userId: string
): Promise<Prompt> => {
  const batch = writeBatch(db);

  const promptRef = doc(collection(db, "prompts"));
  const versionRef = doc(collection(db, "prompt_versions"));

  const { content, ...promptData } = prompt;

  const newVersion: PromptVersion = {
    id: versionRef.id,
    prompt_id: promptRef.id,
    version_number: 1,
    content: content,
    model_settings: {
      model: "gemini-2.5-flash",
      temperature: 0.7,
      max_tokens: 1024,
    },
    created_at: new Date().toISOString(),
  };

  const newPromptData = {
    ...promptData,
    userId,
    created_at: new Date().toISOString(),
    versions: [newVersion],
    current_version_id: versionRef.id,
  };

  batch.set(promptRef, newPromptData);
  batch.set(versionRef, newVersion);

  await batch.commit();

  return { ...newPromptData, id: promptRef.id };
};

export const updatePrompt = async (
  prompt: Prompt,
  content: string
): Promise<Prompt> => {
  const batch = writeBatch(db);
  const promptRef = doc(db, "prompts", prompt.id);
  const versionRef = doc(db, "prompt_versions", prompt.current_version_id);

  const { versions, ...promptData } = prompt;
  batch.update(promptRef, promptData);

  const currentVersion = versions.find(
    (v) => v.id === prompt.current_version_id
  );
  if (currentVersion) {
    batch.update(versionRef, { ...currentVersion, content });
  }

  await batch.commit();

  const updatedVersions = versions.map((v) =>
    v.id === prompt.current_version_id ? { ...v, content } : v
  );

  return { ...prompt, versions: updatedVersions };
};

export const deletePrompt = async (promptId: string): Promise<void> => {
  const batch = writeBatch(db);

  // Delete prompt
  const promptRef = doc(db, "prompts", promptId);
  batch.delete(promptRef);

  // Find and delete versions
  const versionsQuery = query(
    collection(db, "prompt_versions"),
    where("prompt_id", "==", promptId)
  );
  const versionsSnapshot = await getDocs(versionsQuery);
  versionsSnapshot.forEach((doc) => batch.delete(doc.ref));

  await batch.commit();
};

// Tag functions - Assuming tags are public and not user-specific
// If tags should be user-specific, they need similar modifications.

export const getAllTags = async (): Promise<Tag[]> => {
  const tagsCol = collection(db, "tags");
  const tagSnapshot = await getDocs(tagsCol);
  const tagList = tagSnapshot.docs.map(
    (doc) => ({ ...doc.data(), id: doc.id }) as Tag
  );
  return tagList;
};

export const createTag = async (tagData: Omit<Tag, "id">): Promise<Tag> => {
  const docRef = await addDoc(collection(db, "tags"), tagData);
  return { ...tagData, id: docRef.id };
};

export const deleteTag = async (tagId: string): Promise<void> => {
  const batch = writeBatch(db);

  // Delete the tag
  const tagRef = doc(db, "tags", tagId);
  batch.delete(tagRef);

  // Find all prompts with this tag and remove it
  const promptsQuery = query(
    collection(db, "prompts"),
    where("tags", "array-contains", tagId)
  );
  const promptsSnapshot = await getDocs(promptsQuery);

  promptsSnapshot.forEach((promptDoc) => {
    const promptRef = doc(db, "prompts", promptDoc.id);
    const newTags = promptDoc.data().tags.filter((t: string) => t !== tagId);
    batch.update(promptRef, { tags: newTags });
  });

  await batch.commit();
};
