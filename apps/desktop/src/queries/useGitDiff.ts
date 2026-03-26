import { useQuery } from "@tanstack/react-query";
import { gitIpc } from "../ipc/git";

export function useGitDiff(localPath: string | null, staged: boolean, filePath?: string) {
  return useQuery({
    queryKey: ["git-diff", localPath, staged, filePath],
    queryFn: () => gitIpc.getDiff(localPath!, staged, filePath),
    enabled: !!localPath,
  });
}
