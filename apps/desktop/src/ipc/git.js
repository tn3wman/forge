"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitIpc = void 0;
var core_1 = require("@tauri-apps/api/core");
exports.gitIpc = {
    getStatus: function (path) { return (0, core_1.invoke)("git_get_status", { path: path }); },
    getLog: function (path, skip, limit, branch) {
        return (0, core_1.invoke)("git_get_log", { path: path, skip: skip !== null && skip !== void 0 ? skip : 0, limit: limit !== null && limit !== void 0 ? limit : 200, branch: branch !== null && branch !== void 0 ? branch : null });
    },
    getDiff: function (path, staged, filePath) {
        return (0, core_1.invoke)("git_get_diff", { path: path, staged: staged, filePath: filePath !== null && filePath !== void 0 ? filePath : null });
    },
    listBranches: function (path) { return (0, core_1.invoke)("git_list_branches", { path: path }); },
    createBranch: function (path, name, fromRef) {
        return (0, core_1.invoke)("git_create_branch", { path: path, name: name, fromRef: fromRef !== null && fromRef !== void 0 ? fromRef : null });
    },
    checkoutBranch: function (path, name) { return (0, core_1.invoke)("git_checkout_branch", { path: path, name: name }); },
    deleteBranch: function (path, name, force) { return (0, core_1.invoke)("git_delete_branch", { path: path, name: name, force: force !== null && force !== void 0 ? force : null }); },
    deleteRemoteBranch: function (path, remote, branch) {
        return (0, core_1.invoke)("git_delete_remote_branch", { path: path, remote: remote, branch: branch });
    },
    renameBranch: function (path, oldName, newName) {
        return (0, core_1.invoke)("git_rename_branch", { path: path, oldName: oldName, newName: newName });
    },
    getCurrentBranch: function (path) { return (0, core_1.invoke)("git_get_current_branch", { path: path }); },
    stageFiles: function (path, paths) { return (0, core_1.invoke)("git_stage_files", { path: path, paths: paths }); },
    unstageFiles: function (path, paths) { return (0, core_1.invoke)("git_unstage_files", { path: path, paths: paths }); },
    stageAll: function (path) { return (0, core_1.invoke)("git_stage_all", { path: path }); },
    commit: function (path, message) { return (0, core_1.invoke)("git_commit", { path: path, message: message }); },
    amend: function (path, message) { return (0, core_1.invoke)("git_amend", { path: path, message: message }); },
    fetch: function (path, remote) {
        return (0, core_1.invoke)("git_fetch", { path: path, remoteName: remote !== null && remote !== void 0 ? remote : "origin" });
    },
    pull: function (path, remote, branch) {
        return (0, core_1.invoke)("git_pull", { path: path, remoteName: remote !== null && remote !== void 0 ? remote : "origin", branch: branch !== null && branch !== void 0 ? branch : null });
    },
    push: function (path, remote, branch) {
        return (0, core_1.invoke)("git_push", { path: path, remoteName: remote !== null && remote !== void 0 ? remote : "origin", branch: branch !== null && branch !== void 0 ? branch : null });
    },
    stashPush: function (path, message, includeUntracked) {
        return (0, core_1.invoke)("git_stash_push", { path: path, message: message !== null && message !== void 0 ? message : null, includeUntracked: includeUntracked !== null && includeUntracked !== void 0 ? includeUntracked : false });
    },
    stashList: function (path) { return (0, core_1.invoke)("git_stash_list", { path: path }); },
    stashPop: function (path, index) { return (0, core_1.invoke)("git_stash_pop", { path: path, index: index !== null && index !== void 0 ? index : 0 }); },
    stashApply: function (path, index) { return (0, core_1.invoke)("git_stash_apply", { path: path, index: index !== null && index !== void 0 ? index : 0 }); },
    stashDrop: function (path, index) { return (0, core_1.invoke)("git_stash_drop", { path: path, index: index }); },
    cloneRepo: function (url, localPath, repoId) {
        return (0, core_1.invoke)("git_clone_repo", { url: url, localPath: localPath, repoId: repoId !== null && repoId !== void 0 ? repoId : null });
    },
    getRemoteUrl: function (path, remote) {
        return (0, core_1.invoke)("git_get_remote_url", { path: path, remote: remote !== null && remote !== void 0 ? remote : null });
    },
    listWorktrees: function (path) { return (0, core_1.invoke)("git_list_worktrees", { path: path }); },
    createWorktree: function (path, branch, fromRef, worktreeBase) {
        return (0, core_1.invoke)("git_create_worktree", { path: path, branch: branch, fromRef: fromRef !== null && fromRef !== void 0 ? fromRef : null, worktreeBase: worktreeBase !== null && worktreeBase !== void 0 ? worktreeBase : null });
    },
    removeWorktree: function (path, name) { return (0, core_1.invoke)("git_remove_worktree", { path: path, name: name }); },
    unlockWorktree: function (path, name) { return (0, core_1.invoke)("git_unlock_worktree", { path: path, name: name }); },
    startWatching: function (path) { return (0, core_1.invoke)("git_start_watching", { path: path }); },
    stopWatching: function (path) { return (0, core_1.invoke)("git_stop_watching", { path: path }); },
    setLocalPath: function (repoId, localPath) {
        return (0, core_1.invoke)("git_set_local_path", { repoId: repoId, localPath: localPath });
    },
};
