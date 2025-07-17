export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface PromptVersion {
  id: string;
  prompt_id: string;
  version_number: number;
  content: string;
  model_settings: {
    model: "gemini-2.5-flash" | "gpt-4" | "claude-3";
    temperature: number;
    max_tokens: number;
  };
  created_at: string;
}

export interface Prompt {
  id: string;
  project_id: string;
  folder_id: string | null;
  title: string;
  current_version_id: string;
  versions: PromptVersion[];
  tags: string[]; // array of tag ids
  is_favorite: boolean;
  created_at: string;
  userId: string;
}

export interface Folder {
  id: string;
  project_id: string;
  name: string;
  parent_folder_id: string | null;
  is_favorite?: boolean;
  userId: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  userId: string;
}

export interface User {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
}
