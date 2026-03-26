import { useQuery } from "@tanstack/react-query";
import { gitIpc } from "../ipc/git";

export function useGitBranches(localPath: string | null) {
  return useQuery({
    queryKey: ["git-branches", localPath],
    queryFn: () => gitIpc.listBranches(localPath!),
    enabled: !!localPath,
  });
}

export function useCurrentBranch(localPath: string | null) {
  return useQuery({
    queryKey: ["git-current-branch", localPath],
    queryFn: () => gitIpc.getCurrentBranch(localPath!),
    enabled: !!localPath,
  });
}
