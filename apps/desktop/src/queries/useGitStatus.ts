import { useQuery } from "@tanstack/react-query";
import { gitIpc } from "../ipc/git";

export function useGitStatus(localPath: string | null) {
  return useQuery({
    queryKey: ["git-status", localPath],
    queryFn: () => gitIpc.getStatus(localPath!),
    enabled: !!localPath,
    refetchInterval: 5_000,
  });
}
