import { invoke } from "@tauri-apps/api/core";
import type { Workspace } from "@forge/shared";

export interface CreateWorkspaceRequest {
  name: string;
  icon?: string;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  icon?: string;
  color?: string;
}

export const workspaceIpc = {
  create: (request: CreateWorkspaceRequest) =>
    invoke<Workspace>("workspace_create", { request }),

  list: () => invoke<Workspace[]>("workspace_list"),

  get: (id: string) => invoke<Workspace>("workspace_get", { id }),

  update: (id: string, request: UpdateWorkspaceRequest) =>
    invoke<Workspace>("workspace_update", { id, request }),

  delete: (id: string) => invoke<void>("workspace_delete", { id }),

  reorder: (ids: string[]) => invoke<void>("workspace_reorder", { ids }),
};
