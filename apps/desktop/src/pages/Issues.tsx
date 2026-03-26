import { useState, useMemo } from "react";
import { CircleDot, Loader2 } from "lucide-react";
import { useIssues } from "@/queries/useIssues";
import { FilterBar, type FilterOption } from "@/components/common/FilterBar";
import { IssueListItem } from "@/components/github/IssueListItem";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import type { Issue } from "@forge/shared";

const ISSUE_FILTERS: FilterOption[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

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
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { navigateToIssue } = useWorkspaceStore();
  const { data: issues = [], isLoading, error } = useIssues();

  const filters = useMemo<FilterOption[]>(() => {
    return ISSUE_FILTERS.map((f) => ({
      ...f,
      count: filterIssues(issues, f.value, "").length,
    }));
  }, [issues]);

  const filteredIssues = useMemo(
    () => filterIssues(issues, activeFilter, searchQuery),
    [issues, activeFilter, searchQuery],
  );

  return (
    <div className="flex flex-col h-full">
      <FilterBar
        filters={filters}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Filter issues..."
      />

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
            onClick={() => issue.repoFullName && navigateToIssue(issue.repoFullName, issue.number)}
          />
        ))}
      </div>
    </div>
  );
}
