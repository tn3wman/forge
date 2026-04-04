import { useState, useMemo, useEffect } from "react";
import { CircleDot, Loader2, Search, Plus, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useIssues } from "@/queries/useIssues";
import { useRepositories } from "@/queries/useRepositories";
import { IssueListItem } from "@/components/github/IssueListItem";
import { StartWorkDialog } from "@/components/github/StartWorkDialog";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { useIssueLinkedPrs } from "@/hooks/useLinkedItems";
import { useWorkspaceTint } from "@/hooks/useWorkspaceTint";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Issue } from "@forge/shared";

const ISSUE_FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
] as const;

type SortField = "updated" | "created" | "comments" | "title" | "number";
type SortDirection = "asc" | "desc";

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "updated", label: "Updated" },
  { value: "created", label: "Created" },
  { value: "comments", label: "Comments" },
  { value: "title", label: "Title" },
  { value: "number", label: "Number" },
];

const PAGE_SIZE = 50;

function sortIssues(issues: Issue[], field: SortField, direction: SortDirection): Issue[] {
  const dir = direction === "asc" ? 1 : -1;
  return [...issues].sort((a, b) => {
    switch (field) {
      case "updated":
        return dir * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
      case "created":
        return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case "comments":
        return dir * (a.commentsCount - b.commentsCount);
      case "title":
        return dir * a.title.localeCompare(b.title);
      case "number":
        return dir * (a.number - b.number);
    }
  });
}

function filterIssues(issues: Issue[], filter: string, query: string): Issue[] {
  let filtered = issues;

  switch (filter) {
    case "open":
      filtered = issues.filter((i) => i.state === "open");
      break;
    case "closed":
      filtered = issues.filter((i) => i.state === "closed");
      break;
  }

  if (query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (issue) =>
        issue.title.toLowerCase().includes(q) ||
        issue.authorLogin.toLowerCase().includes(q) ||
        String(issue.number).includes(q),
    );
  }

  return filtered;
}

export function Issues() {
  const [activeFilter, setActiveFilter] = useState("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("updated");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [startWorkIssue, setStartWorkIssue] = useState<Issue | null>(null);
  const { navigateToIssue, activeWorkspaceId, setActivePage } = useWorkspaceStore();
  const tintStyle = useWorkspaceTint();
  const { data: issuesData, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useIssues();
  const issues = useMemo(
    () => issuesData?.pages.flatMap((p) => p.issues) ?? [],
    [issuesData],
  );
  const { data: repos } = useRepositories(activeWorkspaceId);
  const linkedPrMap = useIssueLinkedPrs();

  const handleOpenNewIssue = () => {
    if (!activeWorkspaceId) return;
    const repoFullName = repos?.[0]?.fullName ?? "";
    useTerminalStore.getState().addPreSessionTab(activeWorkspaceId, {
      label: "New Issue",
      purpose: { type: "create-issue", repoFullName },
    });
    setActivePage("home");
  };

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of ISSUE_FILTERS) {
      counts[f.value] = filterIssues(issues, f.value, "").length;
    }
    return counts;
  }, [issues]);

  // Keyboard shortcut: "c" to create new issue (when not in an input)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "c" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        handleOpenNewIssue();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [repos]);

  const filteredAndSorted = useMemo(
    () => sortIssues(filterIssues(issues, activeFilter, searchQuery), sortField, sortDirection),
    [issues, activeFilter, searchQuery, sortField, sortDirection],
  );

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedIssues = filteredAndSorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filteredAndSorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filteredAndSorted.length);

  // Reset to page 1 when filter, search, or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery, sortField, sortDirection]);

  return (
    <div className="flex flex-col h-full">
      {/* Title bar with filters — aligned with macOS traffic lights */}
      <div
        className="relative flex shrink-0 items-center gap-2 border-b border-border px-4 h-8"
        data-tauri-drag-region
        style={tintStyle}
      >
        {ISSUE_FILTERS.map((f) => (
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
          style={{ left: "max(50vw - 112px, 400px)" }}
        >
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter issues..."
              className="h-6 pl-7 text-xs w-56 rounded-[10px]"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                {SORT_OPTIONS.find((s) => s.value === sortField)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setSortField(opt.value)}
                  className={cn("text-xs", sortField === opt.value && "font-semibold")}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}
            title={sortDirection === "asc" ? "Ascending" : "Descending"}
          >
            {sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleOpenNewIssue}>
            <Plus className="h-3 w-3 mr-1" />
            New Issue
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Loading issues...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-12 text-destructive">
            <span className="text-sm">Failed to load issues</span>
          </div>
        )}

        {!isLoading && !error && filteredAndSorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CircleDot className="h-8 w-8 mb-2 opacity-40" />
            <span className="text-sm">No issues found</span>
          </div>
        )}

        {paginatedIssues.map((issue) => (
          <IssueListItem
            key={issue.id}
            issue={issue}
            linkedPrs={linkedPrMap.get(`${issue.repoFullName}#${issue.number}`)}
            onClick={() => issue.repoFullName && navigateToIssue(issue.repoFullName, issue.number)}
            onStartWork={() => setStartWorkIssue(issue)}
          />
        ))}
      </div>

      {/* Pagination bar */}
      {(filteredAndSorted.length > PAGE_SIZE || hasNextPage) && (
        <div className="flex shrink-0 items-center justify-between border-t border-border px-4 h-8 text-xs text-muted-foreground">
          <span>
            {rangeStart}–{rangeEnd} of {filteredAndSorted.length}{hasNextPage ? "+" : ""}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span>
              Page {safePage} of {totalPages}{hasNextPage ? "+" : ""}
            </span>
            {isFetchingNextPage ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={safePage >= totalPages && !hasNextPage}
                onClick={() => {
                  if (safePage >= totalPages && hasNextPage) {
                    fetchNextPage();
                  }
                  setCurrentPage((p) => p + 1);
                }}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {startWorkIssue && (
        <StartWorkDialog
          open={!!startWorkIssue}
          onOpenChange={(open) => { if (!open) setStartWorkIssue(null); }}
          issue={startWorkIssue}
          linkedPrs={linkedPrMap.get(`${startWorkIssue.repoFullName}#${startWorkIssue.number}`)}
        />
      )}

    </div>
  );
}
