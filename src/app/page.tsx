"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import PromptList from "../components/PromptList";
import PromptEditorModal from "../components/PromptEditorModal";
import ProjectEditorModal from "../components/ProjectEditorModal";
import FolderEditorModal from "../components/FolderEditorModal";
import FeedbackModal from "../components/FeedbackModal";
import UserProfileModal from "../components/UserProfileModal";
import Login from "../components/Login";
import {
  getProjects,
  createPrompt,
  updatePrompt,
  deletePrompt,
  createProject,
  createFolder,
  updateFolder,
  deleteFolder,
  deleteProject,
  getAllFolders,
  getAllTags,
  getAllPrompts,
  createTag,
  deleteTag,
  uploadProfilePicture,
  updateUserProfile,
} from "../services/firebaseService";
import type { Project, Folder, Prompt, Tag, User } from "../types";
import { onAuthChange, signOut } from "../services/firebaseService";
import { auth } from "../lib/firebase";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [showingAllPrompts, setShowingAllPrompts] = useState(false);

  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isUserProfileModalOpen, setUserProfileModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange(setUser);
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;
      setLoading(true);
      const projectsData = await getProjects(user.uid);
      setProjects(projectsData);
      if (projectsData.length > 0) {
        setSelectedProjectId(projectsData[0].id);
      }
      setLoading(false);
    };
    fetchProjects();
  }, [user]);

  useEffect(() => {
    const fetchFolders = async () => {
      if (!user) return;
      const foldersData = await getAllFolders(user.uid);
      setFolders(foldersData);
    };
    fetchFolders();
  }, [user]);

  useEffect(() => {
    const fetchTags = async () => {
      const tagsData = await getAllTags();
      setTags(tagsData);
    };
    fetchTags();
  }, []);

  useEffect(() => {
    const fetchPrompts = async () => {
      if (!user) return;
      setLoading(true);
      const promptsData = await getAllPrompts(user.uid);
      setPrompts(promptsData);
      setLoading(false);
    };
    fetchPrompts();
  }, [user]);

  const filteredPrompts = useMemo(() => {
    if (showingAllPrompts) {
      return prompts.filter((prompt) => {
        const hasTag =
          selectedTagId === null ? true : prompt.tags.includes(selectedTagId);
        return hasTag;
      });
    }

    if (!selectedProjectId) return [];

    return prompts.filter((prompt) => {
      const inProject = prompt.project_id === selectedProjectId;
      const inFolder =
        selectedFolderId === null
          ? true
          : prompt.folder_id === selectedFolderId;
      const hasTag =
        selectedTagId === null ? true : prompt.tags.includes(selectedTagId);
      return inProject && inFolder && hasTag;
    });
  }, [
    prompts,
    selectedProjectId,
    selectedFolderId,
    selectedTagId,
    showingAllPrompts,
  ]);

  const handleSelectProject = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedFolderId(null);
    setShowingAllPrompts(false);
  }, []);

  const handleSelectFolder = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId);
    setShowingAllPrompts(false);
  }, []);

  const handleSelectTag = useCallback((tagId: string | null) => {
    setSelectedTagId(tagId);
  }, []);

  const handleShowAllPrompts = useCallback(() => {
    setShowingAllPrompts(true);
    setSelectedProjectId(null);
    setSelectedFolderId(null);
  }, []);

  const handleSelectPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt);
  };

  const handleAddProject = () => {
    setProjectModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectModalOpen(true);
  };

  const handleEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
  };

  const handleCloseModal = () => {
    setEditingPrompt(null);
    setProjectModalOpen(false);
    setEditingFolder(null);
    setEditingProject(null);
    setFeedbackModalOpen(false);
  };

  const handleToggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const handleCreatePrompt = () => {
    if (!user || (!selectedProjectId && !showingAllPrompts)) return;

    const newPrompt: Omit<
      Prompt,
      "id" | "created_at" | "versions" | "current_version_id"
    > = {
      project_id: selectedProjectId || projects[0].id,
      folder_id: selectedFolderId,
      title: "",
      tags: [],
      is_favorite: false,
      userId: user.uid,
    };

    setEditingPrompt(newPrompt as unknown as Prompt);
  };

  const handleCreateFolder = (parentId?: string) => {
    if (!user || !selectedProjectId) return;
    setEditingFolder({
      id: "",
      name: "",
      project_id: selectedProjectId,
      parent_folder_id: parentId || null,
    } as Folder);
  };

  const handleSaveProject = async (project: Omit<Project, "id">) => {
    if (!user) return;
    try {
      const newProject = await createProject(project, user.uid);
      setProjects([...projects, newProject]);
      setSelectedProjectId(newProject.id);
      handleCloseModal();
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      setProjects(projects.filter((p) => p.id !== projectId));
      if (selectedProjectId === projectId) {
        setSelectedProjectId(projects.length > 1 ? projects[1].id : null);
      }
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const handleSavePrompt = async (
    updatedPrompt: Prompt,
    newTags: Tag[],
    content: string
  ) => {
    if (!user) return;
    try {
      // Create new tags if any
      const createdTags = await Promise.all(
        newTags
          .filter((t) => !tags.find((et) => et.name === t.name))
          .map((t: Tag) => createTag({ name: t.name, color: t.color }))
      );
      const allTags = [...tags, ...createdTags];
      setTags(allTags);

      if (updatedPrompt.id) {
        // Update existing prompt
        const promptToUpdate = {
          ...updatedPrompt,
          tags: [...updatedPrompt.tags, ...createdTags.map((t: Tag) => t.id)],
        };
        const savedPrompt = await updatePrompt(promptToUpdate, content);
        setPrompts(
          prompts.map((p) => (p.id === savedPrompt.id ? savedPrompt : p))
        );
      } else {
        // Create new prompt
        const newPromptData = {
          ...updatedPrompt,
          tags: [...updatedPrompt.tags, ...createdTags.map((t: Tag) => t.id)],
        };
        const newPrompt = await createPrompt(
          { ...newPromptData, content },
          user.uid
        );
        setPrompts([...prompts, newPrompt]);
      }
      handleCloseModal();
    } catch (error) {
      console.error("Error saving prompt:", error);
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    try {
      await deletePrompt(promptId);
      setPrompts(prompts.filter((p) => p.id !== promptId));
    } catch (error) {
      console.error("Error deleting prompt:", error);
    }
  };

  const handleSaveFolder = async (
    folder: Omit<Folder, "id" | "project_id" | "is_favorite">
  ) => {
    if (!user || !selectedProjectId) return;
    try {
      const newFolder = await createFolder(
        {
          ...folder,
          project_id: selectedProjectId,
        },
        user.uid
      );
      setFolders([...folders, newFolder]);
      handleCloseModal();
    } catch (error) {
      console.error("Error creating folder:", error);
    }
  };

  const handleUpdateFolder = async (folder: Folder) => {
    try {
      const updatedFolder = await updateFolder(folder);
      setFolders(
        folders.map((f) => (f.id === updatedFolder.id ? updatedFolder : f))
      );
    } catch (error) {
      console.error("Error updating folder:", error);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await deleteFolder(folderId);
      setFolders(folders.filter((f) => f.id !== folderId));
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }
    } catch (error) {
      console.error("Error deleting folder:", error);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await deleteTag(tagId);
      setTags(tags.filter((t) => t.id !== tagId));
    } catch (error) {
      console.error("Error deleting tag:", error);
    }
  };

  const handleToggleFolderFavorite = async (folder: Folder) => {
    const updatedFolder = { ...folder, is_favorite: !folder.is_favorite };
    await handleUpdateFolder(updatedFolder);
  };

  const handleOpenFeedbackModal = () => {
    setFeedbackModalOpen(true);
  };

  const handleSubmitFeedback = async (message: string) => {
    console.log("Feedback submitted:", message);
    // Here you would typically send the feedback to your backend
    handleCloseModal();
  };

  const handleOpenUserProfileModal = () => {
    setUserProfileModalOpen(true);
  };

  const handleSaveProfile = async (displayName: string, file: File | null) => {
    if (!user || !auth.currentUser) return;
    try {
      let photoURL = user.photoURL;
      if (file) {
        photoURL = await uploadProfilePicture(user.uid, file);
      }
      await updateUserProfile(
        auth.currentUser,
        displayName,
        photoURL || undefined
      );
      // Manually update the user object in state to reflect changes immediately
      setUser({ ...user, displayName, photoURL });
      setUserProfileModalOpen(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  if (!user) {
    return <Login />;
  }

  return (
    <div className="h-screen w-screen bg-zinc-900 flex text-slate-200 font-sans">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={handleToggleSidebar}
        projects={projects}
        folders={folders}
        allTags={tags}
        selectedProjectId={selectedProjectId}
        onSelectProject={handleSelectProject}
        selectedFolderId={selectedFolderId}
        onSelectFolder={handleSelectFolder}
        selectedTagId={selectedTagId}
        onSelectTag={handleSelectTag}
        onAddProject={handleAddProject}
        onEditProject={handleEditProject}
        onAddFolder={handleCreateFolder}
        onEditFolder={handleEditFolder}
        onToggleFolderFavorite={handleToggleFolderFavorite}
        onShowAllPrompts={handleShowAllPrompts}
        showingAllPrompts={showingAllPrompts}
        onOpenFeedbackModal={handleOpenFeedbackModal}
        onOpenUserProfileModal={handleOpenUserProfileModal}
        user={user}
        onSignOut={handleSignOut}
        onDeleteTag={handleDeleteTag}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <p>Loading...</p>
          </div>
        )}
        {!loading && (
          <PromptList
            prompts={filteredPrompts}
            allTags={tags}
            selectedProject={
              projects.find((p) => p.id === selectedProjectId) || null
            }
            selectedFolder={
              folders.find((f) => f.id === selectedFolderId) || null
            }
            onSelectPrompt={handleSelectPrompt}
            onCreatePrompt={handleCreatePrompt}
            onSelectTag={handleSelectTag}
            selectedTagId={selectedTagId}
            showingAllPrompts={showingAllPrompts}
            onToggleSidebar={handleToggleSidebar}
          />
        )}
      </main>

      {editingPrompt && (
        <PromptEditorModal
          prompt={editingPrompt}
          allTags={tags}
          onClose={handleCloseModal}
          onSave={(prompt, newTags, content) =>
            handleSavePrompt(prompt, newTags, content)
          }
          onDelete={handleDeletePrompt}
        />
      )}
      {isProjectModalOpen && (
        <ProjectEditorModal
          isOpen={isProjectModalOpen}
          project={editingProject}
          onClose={handleCloseModal}
          onSave={handleSaveProject}
          onDelete={handleDeleteProject}
        />
      )}
      {editingFolder && (
        <FolderEditorModal
          isOpen={!!editingFolder}
          folder={editingFolder}
          onClose={handleCloseModal}
          onSave={handleSaveFolder}
          onUpdate={handleUpdateFolder}
          onDelete={handleDeleteFolder}
          allFolders={folders}
        />
      )}
      {isFeedbackModalOpen && (
        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleSubmitFeedback}
        />
      )}
      {isUserProfileModalOpen && (
        <UserProfileModal
          user={user}
          isOpen={isUserProfileModalOpen}
          onClose={() => setUserProfileModalOpen(false)}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
}
