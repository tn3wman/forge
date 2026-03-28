import { useState, useMemo } from "react";
import { GitPullRequest, Loader2, Search } from "lucide-react";
import { useWorkspaceTint } from "@/hooks/useWorkspaceTint";
import { usePullRequests } from "@/queries/usePullRequests";
import { PrListItem } from "@/components/github/PrListItem";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PullRequest } from "@forge/shared";

const PR_FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "review_requested", label: "Review Requested" },
  { value: "draft", label: "Draft" },
] as const;

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
  const [activeFilter, setActiveFilter] = useState("open");
  const [searchQuery, setSearchQuery] = useState("");
  const { navigateToPr } = useWorkspaceStore();
  const tintStyle = useWorkspaceTint();
  const { data: pullRequests = [], isLoading, error } = usePullRequests();

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of PR_FILTERS) {
      counts[f.value] = filterPrs(pullRequests, f.value, "").length;
    }
    return counts;
  }, [pullRequests]);

  const filteredPrs = useMemo(
    () => filterPrs(pullRequests, activeFilter, searchQuery),
    [pullRequests, activeFilter, searchQuery],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Title bar with filters — matches Issues page pattern */}
      <div
        className="relative flex shrink-0 items-center gap-2 border-b border-border px-4 h-8"
        data-tauri-drag-region
        style={tintStyle}
      >
        {PR_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors shrink-0",
              activeFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-accent-foreground hover:bg-accent/80",
            )}
          >
            {f.label}
            {filterCounts[f.value] != null && (
              <span className="ml-1 opacity-70">{filterCounts[f.value]}</span>
            )}
          </button>
        ))}

        {/* Search bar — centered in the window, clamped so it can't overlap pills */}
        <div
          className="fixed top-1 z-10"
          style={{ left: "max(50vw - 112px, 540px)" }}
        >
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter pull requests..."
              className="h-6 pl-7 text-xs w-56 rounded-[10px]"
            />
          </div>
        </div>
      </div>

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
