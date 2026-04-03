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

export function useRepoLabels(owner: string | null, repo: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ["repoLabels", owner, repo],
    queryFn: () => githubIpc.listRepoLabels(owner!, repo!),
    enabled: isAuthenticated && !!owner && !!repo,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRepoAssignees(owner: string | null, repo: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ["repoAssignees", owner, repo],
    queryFn: () => githubIpc.listRepoAssignees(owner!, repo!),
    enabled: isAuthenticated && !!owner && !!repo,
    staleTime: 5 * 60 * 1000,
  });
}
