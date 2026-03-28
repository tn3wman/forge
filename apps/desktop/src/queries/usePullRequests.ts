import { useQuery } from "@tanstack/react-query";
import { githubIpc } from "@/ipc/github";
import { useAuthStore } from "@/stores/authStore";
import { useRepositories } from "./useRepositories";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import type { PullRequest } from "@forge/shared";

export function usePullRequests(state?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { activeWorkspaceId } = useWorkspaceStore();
  const { data: repos } = useRepositories(activeWorkspaceId);

  return useQuery({
    queryKey: ["pullRequests", activeWorkspaceId, state, repos?.map((r) => r.fullName)],
    queryFn: async (): Promise<PullRequest[]> => {
      if (!repos || repos.length === 0) return [];

      const results = await Promise.all(
        repos.map((repo) =>
          githubIpc
            .listPrs(repo.owner, repo.name, state)
            .then((prs) => prs.map((pr) => ({ ...pr, repoFullName: repo.fullName })))
            .catch((e) => {
              console.error(`Failed to fetch PRs for ${repo.fullName}:`, e);
              return [] as PullRequest[];
            }),
        ),
      );

      // Flatten and sort by updatedAt descending
      return results
        .flat()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    },
    enabled: isAuthenticated && !!repos && repos.length > 0,
    refetchInterval: 60_000, // Poll every 60s
  });
}
