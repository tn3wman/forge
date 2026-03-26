import { useMemo, useRef, useCallback, useState } from "react";
import { GitCommit, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGitLog } from "@/queries/useGitLog";
import { useCurrentBranch, useGitBranches } from "@/queries/useGitBranches";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { CommitGraphCanvas } from "@/components/git/CommitGraphCanvas";
import { Button } from "@/components/ui/button";
import { GitRepoSelector } from "@/components/git/GitRepoSelector";
import type { GraphRow, BranchInfo } from "@forge/shared";

const ROW_HEIGHT = 32;
const LANE_WIDTH = 20;

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function CommitGraph() {
  const selectedRepoLocalPath = useWorkspaceStore(
    (s) => s.selectedRepoLocalPath,
  );
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>(
    undefined,
  );
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const { data: currentBranch } = useCurrentBranch(selectedRepoLocalPath);
  const { data: branches = [] } = useGitBranches(selectedRepoLocalPath);

  const activeBranch = selectedBranch ?? currentBranch ?? undefined;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useGitLog(selectedRepoLocalPath, activeBranch);

  const rows: GraphRow[] = useMemo(
    () => data?.pages.flatMap((page) => page) ?? [],
    [data],
  );

  // Build a map of branch tips for badge display
  const branchTips = useMemo(() => {
    const map = new Map<string, BranchInfo[]>();
    for (const branch of branches) {
      if (branch.isRemote) continue;
      const existing = map.get(branch.commitOid) ?? [];
      existing.push(branch);
      map.set(branch.commitOid, existing);
    }
    return map;
  }, [branches]);

  const maxColumn = useMemo(() => {
    let max = 0;
    for (const row of rows) {
      if (row.column > max) max = row.column;
      for (const line of row.lines) {
        if (line.fromColumn > max) max = line.fromColumn;
        if (line.toColumn > max) max = line.toColumn;
      }
    }
    return max;
  }, [rows]);

  const canvasWidth = Math.max(60, (maxColumn + 1) * LANE_WIDTH + LANE_WIDTH);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);

    // Infinite scroll: fetch more when near bottom
    const distanceToBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceToBottom < ROW_HEIGHT * 5 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!selectedRepoLocalPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <GitCommit className="h-8 w-8 mb-2 opacity-50" />
        <span className="text-sm">Select a repository to view the commit graph</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Loading commit history...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Repo + Branch selector */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <GitRepoSelector />
        <div className="mx-1 h-4 w-px bg-border" />
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1"
            onClick={() => setBranchMenuOpen((prev) => !prev)}
          >
            <GitCommit className="h-3 w-3" />
            {activeBranch ?? "All branches"}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
          {branchMenuOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 min-w-[200px] max-h-[300px] overflow-y-auto rounded-md border border-border bg-background shadow-md">
              <button
                className={cn(
                  "w-full text-left px-3 py-1.5 text-xs hover:bg-accent/50",
                  !selectedBranch && "bg-accent text-accent-foreground",
                )}
                onClick={() => {
                  setSelectedBranch(undefined);
                  setBranchMenuOpen(false);
                }}
              >
                Default ({currentBranch ?? "HEAD"})
              </button>
              {branches
                .filter((b) => !b.isRemote)
                .map((branch) => (
                  <button
                    key={branch.name}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-xs hover:bg-accent/50",
                      selectedBranch === branch.name &&
                        "bg-accent text-accent-foreground",
                    )}
                    onClick={() => {
                      setSelectedBranch(branch.name);
                      setBranchMenuOpen(false);
                    }}
                  >
                    {branch.name}
                    {branch.isHead && (
                      <span className="ml-1 text-muted-foreground">
                        (HEAD)
                      </span>
                    )}
                  </button>
                ))}
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {rows.length} commits
        </span>
      </div>

      {/* Commit graph and list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative"
      >
        <div style={{ height: rows.length * ROW_HEIGHT }} className="relative">
          {/* Canvas overlay for graph lanes */}
          <div
            className="sticky left-0 top-0 h-full float-left"
            style={{ width: canvasWidth, height: scrollRef.current?.clientHeight ?? "100%" }}
          >
            <CommitGraphCanvas
              rows={rows}
              rowHeight={ROW_HEIGHT}
              scrollTop={scrollTop}
              width={canvasWidth}
            />
          </div>

          {/* Commit rows */}
          <div style={{ marginLeft: canvasWidth }}>
            {rows.map((row, index) => {
              const branchLabels = branchTips.get(row.commit.oid);
              return (
                <div
                  key={row.commit.oid}
                  className="flex items-center gap-3 px-2 hover:bg-accent/50"
                  style={{ height: ROW_HEIGHT }}
                >
                  <span className="font-mono text-xs text-blue-400 shrink-0 w-[60px]">
                    {row.commit.shortId}
                  </span>

                  {branchLabels?.map((b) => (
                    <span
                      key={b.name}
                      className="shrink-0 rounded-full border border-border bg-muted px-1.5 py-0 text-[10px] text-muted-foreground leading-4"
                    >
                      {b.name}
                    </span>
                  ))}

                  <span className="text-xs text-foreground truncate min-w-0 flex-1">
                    {row.commit.message.split("\n")[0]}
                  </span>

                  <span className="text-xs text-muted-foreground shrink-0 w-[100px] truncate text-right">
                    {row.commit.author}
                  </span>

                  <span className="text-xs text-muted-foreground shrink-0 w-[60px] text-right">
                    {formatRelativeTime(row.commit.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {isFetchingNextPage && (
          <div className="flex items-center justify-center py-3 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-xs">Loading more commits...</span>
          </div>
        )}
      </div>
    </div>
  );
}
