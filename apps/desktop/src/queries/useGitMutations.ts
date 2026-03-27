import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../stores/authStore";
import { gitIpc } from "../ipc/git";

export function useStageFiles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, paths }: { path: string; paths: string[] }) =>
      gitIpc.stageFiles(path, paths),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git-status"] });
      queryClient.invalidateQueries({ queryKey: ["git-diff"] });
    },
  });
}

export function useUnstageFiles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, paths }: { path: string; paths: string[] }) =>
      gitIpc.unstageFiles(path, paths),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git-status"] });
      queryClient.invalidateQueries({ queryKey: ["git-diff"] });
    },
  });
}

export function useStageAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ path }: { path: string }) => gitIpc.stageAll(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git-status"] });
      queryClient.invalidateQueries({ queryKey: ["git-diff"] });
    },
  });
}

export function useCommit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, message }: { path: string; message: string }) =>
      gitIpc.commit(path, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git-status"] });
      queryClient.invalidateQueries({ queryKey: ["git-log"] });
      queryClient.invalidateQueries({ queryKey: ["git-diff"] });
      queryClient.invalidateQueries({ queryKey: ["git-branches"] });
    },
  });
}

export function useAmend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, message }: { path: string; message: string }) =>
      gitIpc.amend(path, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git-status"] });
      queryClient.invalidateQueries({ queryKey: ["git-log"] });
      queryClient.invalidateQueries({ queryKey: ["git-diff"] });
    },
  });
}

export function useGitFetch() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: async ({ path, remote }: { path: string; remote?: string }) =>
      gitIpc.fetch(path, token!, remote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git-branches"] });
      queryClient.invalidateQueries({ queryKey: ["git-log"] });
    },
  });
}

export function useGitPull() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: async ({ path, remote, branch }: { path: string; remote?: string; branch?: string }) =>
      gitIpc.pull(path, token!, remote, branch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git-branches"] });
      queryClient.invalidateQueries({ queryKey: ["git-log"] });
      queryClient.invalidateQueries({ queryKey: ["git-status"] });
    },
  });
}

export function useGitPush() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: async ({ path, remote, branch }: { path: string; remote?: string; branch?: string }) =>
      gitIpc.push(path, token!, remote, branch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git-branches"] });
    },
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, name, fromRef }: { path: string; name: string; fromRef?: string }) =>
      gitIpc.createBranch(path, name, fromRef),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git-branches"] });
    },
  });
}

export function useCheckoutBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, name }: { path: string; name: string }) =>
      gitIpc.checkoutBranch(path, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git-branches"] });
      queryClient.invalidateQueries({ queryKey: ["git-current-branch"] });
      queryClient.invalidateQueries({ queryKey: ["git-status"] });
      queryClient.invalidateQueries({ queryKey: ["git-log"] });
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, name, force }: { path: string; name: string; force?: boolean }) =>
      gitIpc.deleteBranch(path, name, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git-branches"] });
      queryClient.invalidateQueries({ queryKey: ["git-worktrees"] });
    },
  });
}

export function useRenameBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, oldName, newName }: { path: string; oldName: string; newName: string }) =>
      gitIpc.renameBranch(path, oldName, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git-branches"] });
    },
  });
}

export function useStashPush() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, message, includeUntracked }: { path: string; message?: string; includeUntracked?: boolean }) =>
      gitIpc.stashPush(path, message, includeUntracked),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git-status"] });
      queryClient.invalidateQueries({ queryKey: ["git-diff"] });
    },
  });
}

export function useStashPop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, index }: { path: string; index?: number }) =>
      gitIpc.stashPop(path, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git-status"] });
      queryClient.invalidateQueries({ queryKey: ["git-diff"] });
    },
  });
}

export function useStashApply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, index }: { path: string; index?: number }) =>
      gitIpc.stashApply(path, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git-status"] });
      queryClient.invalidateQueries({ queryKey: ["git-diff"] });
    },
  });
}

export function useStashDrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, index }: { path: string; index: number }) =>
      gitIpc.stashDrop(path, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git-stash"] });
    },
  });
}

export function useCloneRepo() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: async ({ url, localPath, repoId }: { url: string; localPath: string; repoId?: string }) =>
      gitIpc.cloneRepo(url, localPath, token!, repoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
    },
  });
}

export function useSetLocalPath() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ repoId, localPath }: { repoId: string; localPath: string }) =>
      gitIpc.setLocalPath(repoId, localPath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
    },
  });
}
