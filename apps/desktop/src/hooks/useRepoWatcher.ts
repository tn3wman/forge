import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useQueryClient } from "@tanstack/react-query";
import { gitIpc } from "@/ipc/git";

interface RepoChangedPayload {
  path: string;
}

export function useRepoWatcher(localPath: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!localPath) return;

    gitIpc.startWatching(localPath).catch(() => {
      // Watcher may fail if path is invalid — silently ignore
    });

    const unlisten = listen<RepoChangedPayload>("repo-changed", (event) => {
      if (event.payload.path === localPath) {
        queryClient.invalidateQueries({ queryKey: ["git-status", localPath] });
        queryClient.invalidateQueries({ queryKey: ["git-log", localPath] });
        queryClient.invalidateQueries({ queryKey: ["git-branches", localPath] });
        queryClient.invalidateQueries({ queryKey: ["git-current-branch", localPath] });
        queryClient.invalidateQueries({ queryKey: ["git-stash", localPath] });
      }
    });

    return () => {
      gitIpc.stopWatching(localPath).catch(() => {});
      unlisten.then((fn) => fn());
    };
  }, [localPath, queryClient]);
}
