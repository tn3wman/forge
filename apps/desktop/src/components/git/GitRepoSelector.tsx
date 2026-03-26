import { useState, useRef, useEffect } from "react";
import { ChevronDown, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRepositories } from "@/queries/useRepositories";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import type { Repository } from "@forge/shared";

export function GitRepoSelector() {
  const { activeWorkspaceId, selectedRepoLocalPath } = useWorkspaceStore();
  const setPath = useWorkspaceStore((s) => s.selectedRepoLocalPath);
  const { data: repos = [] } = useRepositories(activeWorkspaceId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const reposWithPath = repos.filter((r): r is Repository & { localPath: string } => !!r.localPath);
  const activeRepo = reposWithPath.find((r) => r.localPath === selectedRepoLocalPath);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (reposWithPath.length <= 1) {
    // Only one repo — just show the name, no dropdown
    return activeRepo ? (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Database className="h-3 w-3" />
        <span className="font-mono truncate max-w-[200px]">{activeRepo.fullName}</span>
      </div>
    ) : null;
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs"
        onClick={() => setOpen((v) => !v)}
      >
        <Database className="h-3 w-3" />
        <span className="font-mono truncate max-w-[200px]">
          {activeRepo?.fullName ?? "Select repo"}
        </span>
        <ChevronDown className="h-3 w-3" />
      </Button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[220px] max-h-[300px] overflow-y-auto rounded-md border border-border bg-background shadow-md">
          {reposWithPath.map((repo) => (
            <button
              key={repo.id}
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs hover:bg-accent/50 font-mono",
                repo.localPath === selectedRepoLocalPath && "bg-accent text-accent-foreground",
              )}
              onClick={() => {
                // Update the store's selectedRepoLocalPath
                const { activePage, navigateToChanges, navigateToCommitGraph, navigateToBranches } = useWorkspaceStore.getState();
                switch (activePage) {
                  case "changes": navigateToChanges(repo.localPath); break;
                  case "commit-graph": navigateToCommitGraph(repo.localPath); break;
                  case "branches": navigateToBranches(repo.localPath); break;
                }
                setOpen(false);
              }}
            >
              {repo.fullName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
