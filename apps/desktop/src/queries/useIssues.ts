import { useQuery } from "@tanstack/react-query";
import { githubIpc } from "@/ipc/github";
import { useAuthStore } from "@/stores/authStore";
import { useRepositories } from "./useRepositories";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import type { Issue } from "@forge/shared";

export function useIssues(state?: string) {
  const token = useAuthStore((s) => s.token);
  const { activeWorkspaceId } = useWorkspaceStore();
  const { data: repos } = useRepositories(activeWorkspaceId);

  return useQuery({
    queryKey: ["issues", activeWorkspaceId, state, repos?.map((r) => r.fullName)],
    queryFn: async (): Promise<Issue[]> => {
      if (!token || !repos || repos.length === 0) return [];

      const results = await Promise.all(
        repos.map((repo) =>
          githubIpc
            .listIssues(token, repo.owner, repo.name, state)
            .then((issues) => issues.map((issue) => ({ ...issue, repoFullName: repo.fullName })))
            .catch((e) => {
              console.error(`Failed to fetch issues for ${repo.fullName}:`, e);
              return [] as Issue[];
            }),
        ),
      );

      return results
        .flat()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    },
    enabled: !!token && !!repos && repos.length > 0,
    refetchInterval: 60_000,
  });
}
