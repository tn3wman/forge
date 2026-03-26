import { useState, useRef, useEffect } from "react";
import { GitBranch, ArrowDown, ArrowDownToLine, ArrowUpFromLine, Loader2, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCurrentBranch, useGitBranches } from "@/queries/useGitBranches";
import { useGitFetch, useGitPull, useGitPush, useCheckoutBranch } from "@/queries/useGitMutations";
import { GitRepoSelector } from "./GitRepoSelector";

interface RemoteActionsProps {
  localPath: string;
}

export function RemoteActions({ localPath }: RemoteActionsProps) {
  const { data: currentBranch } = useCurrentBranch(localPath);
  const { data: branches = [] } = useGitBranches(localPath);
  const fetchMutation = useGitFetch();
  const pullMutation = useGitPull();
  const pushMutation = useGitPush();
  const checkoutMutation = useCheckoutBranch();
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const localBranches = branches.filter((b) => !b.isRemote);

  // Close on outside click
  useEffect(() => {
    if (!branchMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setBranchMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [branchMenuOpen]);

  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
      <GitRepoSelector />

      <div className="mx-1 h-4 w-px bg-border" />

      {/* Branch selector with checkout */}
      <div ref={menuRef} className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => setBranchMenuOpen((v) => !v)}
          disabled={checkoutMutation.isPending}
        >
          <GitBranch className="h-3 w-3" />
          <span className="font-mono truncate max-w-[240px]">
            {checkoutMutation.isPending ? "Switching..." : (currentBranch ?? "...")}
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
        {branchMenuOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 min-w-[240px] max-h-[300px] overflow-y-auto rounded-md border border-border bg-background shadow-md">
            {localBranches.map((branch) => (
              <button
                key={branch.name}
                className={cn(
                  "w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs hover:bg-accent/50 font-mono",
                  branch.isHead && "bg-accent/30",
                )}
                onClick={() => {
                  if (!branch.isHead) {
                    checkoutMutation.mutate({ path: localPath, name: branch.name });
                  }
                  setBranchMenuOpen(false);
                }}
              >
                {branch.isHead ? (
                  <Check className="h-3 w-3 text-green-400 shrink-0" />
                ) : (
                  <span className="w-3 shrink-0" />
                )}
                <span className="truncate">{branch.name}</span>
              </button>
            ))}
            {localBranches.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">No local branches</div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => fetchMutation.mutate({ path: localPath })}
        disabled={fetchMutation.isPending}
        title="Fetch"
      >
        {fetchMutation.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )}
        Fetch
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => pullMutation.mutate({ path: localPath })}
        disabled={pullMutation.isPending}
        title="Pull"
      >
        {pullMutation.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <ArrowDownToLine className="h-3 w-3" />
        )}
        Pull
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => pushMutation.mutate({ path: localPath })}
        disabled={pushMutation.isPending}
        title="Push"
      >
        {pushMutation.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <ArrowUpFromLine className="h-3 w-3" />
        )}
        Push
      </Button>
    </div>
  );
}
