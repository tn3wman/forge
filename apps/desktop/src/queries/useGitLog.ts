import { useInfiniteQuery } from "@tanstack/react-query";
import { gitIpc } from "../ipc/git";

export function useGitLog(localPath: string | null, branch?: string) {
  return useInfiniteQuery({
    queryKey: ["git-log", localPath, branch],
    queryFn: ({ pageParam = 0 }) => gitIpc.getLog(localPath!, pageParam, 200, branch),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 200 ? allPages.length * 200 : undefined,
    enabled: !!localPath,
  });
}
