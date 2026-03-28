import { useQuery } from "@tanstack/react-query";
import { githubIpc } from "@/ipc/github";
import { useAuthStore } from "@/stores/authStore";

export function useIssueDetail(owner: string | null, repo: string | null, number: number | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ["issueDetail", owner, repo, number],
    queryFn: () => githubIpc.getIssueDetail(owner!, repo!, number!),
    enabled: isAuthenticated && !!owner && !!repo && number != null,
  });
}
