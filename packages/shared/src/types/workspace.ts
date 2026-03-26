export interface Workspace {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Repository {
  id: string;
  workspaceId: string;
  owner: string;
  name: string;
  fullName: string;
  localPath: string | null;
  githubId: number | null;
  isPrivate: boolean;
  defaultBranch: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
