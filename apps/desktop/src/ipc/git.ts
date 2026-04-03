import { invoke } from "@tauri-apps/api/core";
import type { FileStatus, DiffEntry, BranchInfo, GraphRow, StashEntry, WorktreeInfo } from "@forge/shared";

export const gitIpc = {
  getStatus: (path: string) => invoke<FileStatus[]>("git_get_status", { path }),
  getLog: (path: string, skip?: number, limit?: number, branch?: string) =>
    invoke<GraphRow[]>("git_get_log", { path, skip: skip ?? 0, limit: limit ?? 200, branch: branch ?? null }),
  getDiff: (path: string, staged: boolean, filePath?: string) =>
    invoke<DiffEntry[]>("git_get_diff", { path, staged, filePath: filePath ?? null }),
  listBranches: (path: string) => invoke<BranchInfo[]>("git_list_branches", { path }),
  createBranch: (path: string, name: string, fromRef?: string) =>
    invoke<BranchInfo>("git_create_branch", { path, name, fromRef: fromRef ?? null }),
  checkoutBranch: (path: string, name: string) => invoke<void>("git_checkout_branch", { path, name }),
  deleteBranch: (path: string, name: string, force?: boolean) => invoke<void>("git_delete_branch", { path, name, force: force ?? null }),
  deleteRemoteBranch: (path: string, remote: string, branch: string) =>
    invoke<void>("git_delete_remote_branch", { path, remote, branch }),
  renameBranch: (path: string, oldName: string, newName: string) =>
    invoke<void>("git_rename_branch", { path, oldName, newName }),
  getCurrentBranch: (path: string) => invoke<string | null>("git_get_current_branch", { path }),
  stageFiles: (path: string, paths: string[]) => invoke<void>("git_stage_files", { path, paths }),
  unstageFiles: (path: string, paths: string[]) => invoke<void>("git_unstage_files", { path, paths }),
  stageAll: (path: string) => invoke<void>("git_stage_all", { path }),
  commit: (path: string, message: string) => invoke<string>("git_commit", { path, message }),
  amend: (path: string, message: string) => invoke<string>("git_amend", { path, message }),
  fetch: (path: string, remote?: string) =>
    invoke<void>("git_fetch", { path, remoteName: remote ?? "origin" }),
  pull: (path: string, remote?: string, branch?: string) =>
    invoke<void>("git_pull", { path, remoteName: remote ?? "origin", branch: branch ?? null }),
  push: (path: string, remote?: string, branch?: string) =>
    invoke<void>("git_push", { path, remoteName: remote ?? "origin", branch: branch ?? null }),
  syncBranch: (path: string, remote: string, branch: string) =>
    invoke<void>("git_sync_branch", { path, remoteName: remote, branch }),
  stashPush: (path: string, message?: string, includeUntracked?: boolean) =>
    invoke<string>("git_stash_push", { path, message: message ?? null, includeUntracked: includeUntracked ?? false }),
  stashList: (path: string) => invoke<StashEntry[]>("git_stash_list", { path }),
  stashPop: (path: string, index?: number) => invoke<void>("git_stash_pop", { path, index: index ?? 0 }),
  stashApply: (path: string, index?: number) => invoke<void>("git_stash_apply", { path, index: index ?? 0 }),
  stashDrop: (path: string, index: number) => invoke<void>("git_stash_drop", { path, index }),
  cloneRepo: (url: string, localPath: string, repoId?: string) =>
    invoke<void>("git_clone_repo", { url, localPath, repoId: repoId ?? null }),
  getRemoteUrl: (path: string, remote?: string) =>
    invoke<string | null>("git_get_remote_url", { path, remote: remote ?? null }),
  listWorktrees: (path: string) => invoke<WorktreeInfo[]>("git_list_worktrees", { path }),
  createWorktree: (path: string, branch: string, fromRef?: string, worktreeBase?: string) =>
    invoke<WorktreeInfo>("git_create_worktree", { path, branch, fromRef: fromRef ?? null, worktreeBase: worktreeBase ?? null }),
  removeWorktree: (path: string, name: string) => invoke<void>("git_remove_worktree", { path, name }),
  unlockWorktree: (path: string, name: string) => invoke<void>("git_unlock_worktree", { path, name }),
  startWatching: (path: string) => invoke<void>("git_start_watching", { path }),
  stopWatching: (path: string) => invoke<void>("git_stop_watching", { path }),
  setLocalPath: (repoId: string, localPath: string) =>
    invoke<void>("git_set_local_path", { repoId, localPath }),
};
