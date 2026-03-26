import { useQuery } from "@tanstack/react-query";
import { githubIpc, type DashboardStats } from "@/ipc/github";
import { useAuthStore } from "@/stores/authStore";
import { useRepositories } from "./useRepositories";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function useDashboardStats() {
  const token = useAuthStore((s) => s.token);
  const { activeWorkspaceId } = useWorkspaceStore();
  const { data: repos } = useRepositories(activeWorkspaceId);

  return useQuery({
    queryKey: ["dashboard", activeWorkspaceId, repos?.map((r) => r.fullName)],
    queryFn: async (): Promise<DashboardStats> => {
      if (!token || !repos || repos.length === 0) {
        return { totalOpenPrs: 0, totalOpenIssues: 0, prsNeedingReview: 0, recentlyMerged: 0 };
      }

      return githubIpc.getDashboard(
        token,
        repos.map((r) => ({ owner: r.owner, repo: r.name })),
      );
    },
    enabled: !!token && !!repos && repos.length > 0,
    refetchInterval: 60_000,
  });
}
