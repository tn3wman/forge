import { useState, useMemo, useEffect } from "react";
import { CircleDot, Loader2, Search, Plus } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { Issue } from "@forge/shared";

const ISSUE_FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
] as const;

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
  const [startWorkIssue, setStartWorkIssue] = useState<Issue | null>(null);
  const { navigateToIssue, activeWorkspaceId, setActivePage } = useWorkspaceStore();
  const tintStyle = useWorkspaceTint();
  const { data: issues = [], isLoading, error } = useIssues();
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

  const filteredIssues = useMemo(
    () => filterIssues(issues, activeFilter, searchQuery),
    [issues, activeFilter, searchQuery],
  );

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

        <div className="ml-auto">
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

        {!isLoading && !error && filteredIssues.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CircleDot className="h-8 w-8 mb-2 opacity-40" />
            <span className="text-sm">No issues found</span>
          </div>
        )}

        {filteredIssues.map((issue) => (
          <IssueListItem
            key={issue.id}
            issue={issue}
            linkedPrs={linkedPrMap.get(`${issue.repoFullName}#${issue.number}`)}
            onClick={() => issue.repoFullName && navigateToIssue(issue.repoFullName, issue.number)}
            onStartWork={() => setStartWorkIssue(issue)}
          />
        ))}
      </div>

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
