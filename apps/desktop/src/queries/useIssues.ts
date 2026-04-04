import { useInfiniteQuery } from "@tanstack/react-query";
import { githubIpc } from "@/ipc/github";
import { useAuthStore } from "@/stores/authStore";
import { useRepositories } from "./useRepositories";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import type { Issue, PageInfo } from "@forge/shared";

interface IssuesInfinitePage {
  issues: Issue[];
  /** Per-repo pageInfo keyed by repoFullName */
  pageInfoMap: Record<string, PageInfo>;
}

/** Cursor map: repoFullName → endCursor (null means first page) */
type CursorMap = Record<string, string | null>;

export function useIssues(state?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { activeWorkspaceId } = useWorkspaceStore();
  const { data: repos } = useRepositories(activeWorkspaceId);

  return useInfiniteQuery<IssuesInfinitePage, Error, { pages: IssuesInfinitePage[] }, unknown[], CursorMap>({
    queryKey: ["issues", activeWorkspaceId, state, repos?.map((r) => r.fullName)],
    queryFn: async ({ pageParam }): Promise<IssuesInfinitePage> => {
      if (!repos || repos.length === 0) return { issues: [], pageInfoMap: {} };

      const cursors = pageParam;
      const results = await Promise.all(
        repos.map(async (repo) => {
          // Skip repos that have no more pages (cursor explicitly absent after first fetch)
          const cursor = cursors[repo.fullName];
          if (Object.keys(cursors).length > 0 && !(repo.fullName in cursors)) {
            return { issues: [] as Issue[], pageInfo: { hasNextPage: false, endCursor: null } };
          }

          try {
            const page = await githubIpc.listIssues(repo.owner, repo.name, state, cursor);
            const issues = page.items.map((issue) => ({ ...issue, repoFullName: repo.fullName }));
            return { issues, pageInfo: page.pageInfo };
          } catch (e) {
            console.error(`Failed to fetch issues for ${repo.fullName}:`, e);
            return { issues: [] as Issue[], pageInfo: { hasNextPage: false, endCursor: null } };
          }
        }),
      );

      const allIssues = results.flatMap((r) => r.issues);
      const pageInfoMap: Record<string, PageInfo> = {};
      repos.forEach((repo, i) => {
        pageInfoMap[repo.fullName] = results[i].pageInfo;
      });

      return { issues: allIssues, pageInfoMap };
    },
    initialPageParam: {} as CursorMap,
    getNextPageParam: (lastPage) => {
      const nextCursors: CursorMap = {};
      let hasAny = false;
      for (const [repoName, info] of Object.entries(lastPage.pageInfoMap)) {
        if (info.hasNextPage && info.endCursor) {
          nextCursors[repoName] = info.endCursor;
          hasAny = true;
        }
      }
      return hasAny ? nextCursors : undefined;
    },
    enabled: isAuthenticated && !!repos && repos.length > 0,
    refetchInterval: 5 * 60_000,
  });
}
