import { useQuery } from "@tanstack/react-query";
import { githubIpc } from "@/ipc/github";
import { useAuthStore } from "@/stores/authStore";

export function useIssueDetail(owner: string | null, repo: string | null, number: number | null) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["issueDetail", owner, repo, number],
    queryFn: () => githubIpc.getIssueDetail(token!, owner!, repo!, number!),
    enabled: !!token && !!owner && !!repo && number != null,
  });
}
