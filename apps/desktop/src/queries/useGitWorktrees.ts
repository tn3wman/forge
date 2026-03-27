import { useQuery } from "@tanstack/react-query";
import { gitIpc } from "../ipc/git";

export function useGitWorktrees(localPath: string | null) {
  return useQuery({
    queryKey: ["git-worktrees", localPath],
    queryFn: () => gitIpc.listWorktrees(localPath!),
    enabled: !!localPath,
  });
}
