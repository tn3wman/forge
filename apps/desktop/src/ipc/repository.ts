import { invoke } from "@tauri-apps/api/core";
import type { Repository } from "@forge/shared";

export interface AddRepoRequest {
  workspaceId: string;
  owner: string;
  name: string;
  fullName: string;
  githubId?: number;
  isPrivate: boolean;
  defaultBranch: string;
}

export interface SearchRepoResult {
  githubId: number;
  fullName: string;
  name: string;
  owner: string;
  isPrivate: boolean;
  defaultBranch: string;
  description: string | null;
  stars: number;
}

export const repoIpc = {
  add: (request: AddRepoRequest) =>
    invoke<Repository>("repo_add", { request }),

  list: (workspaceId: string) =>
    invoke<Repository[]>("repo_list", { workspaceId }),

  remove: (id: string) => invoke<void>("repo_remove", { id }),

  searchGithub: (query: string) =>
    invoke<SearchRepoResult[]>("github_search_repos", { query }),

  listUserRepos: () =>
    invoke<SearchRepoResult[]>("github_list_user_repos"),
};
