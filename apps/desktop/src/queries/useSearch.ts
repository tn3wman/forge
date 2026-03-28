import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { useAuthStore } from "@/stores/authStore";
import { useRepositories } from "./useRepositories";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export interface SearchResultItem {
  number: number;
  title: string;
  state: string;
  htmlUrl: string;
  authorLogin: string;
  authorAvatarUrl: string;
  createdAt: string;
  updatedAt: string;
  isPullRequest: boolean;
  repoFullName: string;
  labels: { name: string; color: string }[];
}

export function useSearch(query: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { activeWorkspaceId } = useWorkspaceStore();
  const { data: repos } = useRepositories(activeWorkspaceId);
  const repoTuples: [string, string][] =
    repos?.map((r) => [r.owner, r.name] as [string, string]) ?? [];

  return useQuery({
    queryKey: ["search", query, repoTuples.map((r) => r.join("/"))],
    queryFn: () =>
      invoke<SearchResultItem[]>("github_search", {
        query,
        repos: repoTuples,
      }),
    enabled: isAuthenticated && query.length >= 2,
    staleTime: 30_000,
  });
}
