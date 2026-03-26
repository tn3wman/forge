import { useState, useMemo } from "react";
import { GitPullRequest, Loader2 } from "lucide-react";
import { usePullRequests } from "@/queries/usePullRequests";
import { FilterBar, type FilterOption } from "@/components/common/FilterBar";
import { PrListItem } from "@/components/github/PrListItem";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import type { PullRequest } from "@forge/shared";

const PR_FILTERS: FilterOption[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "review_requested", label: "Review Requested" },
  { value: "draft", label: "Draft" },
];

function filterPrs(prs: PullRequest[], filter: string, query: string): PullRequest[] {
  let filtered = prs;

  switch (filter) {
    case "open":
      filtered = prs.filter((pr) => pr.state === "open" && !pr.draft);
      break;
    case "closed":
      filtered = prs.filter((pr) => pr.state === "closed" || pr.state === "merged");
      break;
    case "review_requested":
      filtered = prs.filter((pr) => pr.reviewDecision === "REVIEW_REQUIRED");
      break;
    case "draft":
      filtered = prs.filter((pr) => pr.draft);
      break;
  }

  if (query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (pr) =>
        pr.title.toLowerCase().includes(q) ||
        pr.authorLogin.toLowerCase().includes(q) ||
        String(pr.number).includes(q),
    );
  }

  return filtered;
}

export function PullRequests() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { navigateToPr } = useWorkspaceStore();
  const { data: pullRequests = [], isLoading, error } = usePullRequests();

  const filters = useMemo<FilterOption[]>(() => {
    return PR_FILTERS.map((f) => ({
      ...f,
      count: filterPrs(pullRequests, f.value, "").length,
    }));
  }, [pullRequests]);

  const filteredPrs = useMemo(
    () => filterPrs(pullRequests, activeFilter, searchQuery),
    [pullRequests, activeFilter, searchQuery],
  );

  return (
    <div className="flex flex-col h-full">
      <FilterBar
        filters={filters}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Filter pull requests..."
      />

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Loading pull requests...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-12 text-destructive">
            <span className="text-sm">Failed to load pull requests</span>
          </div>
        )}

        {!isLoading && !error && filteredPrs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <GitPullRequest className="h-8 w-8 mb-2 opacity-40" />
            <span className="text-sm">No pull requests found</span>
          </div>
        )}

        {filteredPrs.map((pr) => (
          <PrListItem
            key={pr.id}
            pr={pr}
            onClick={() => pr.repoFullName && navigateToPr(pr.repoFullName, pr.number)}
          />
        ))}
      </div>
    </div>
  );
}
