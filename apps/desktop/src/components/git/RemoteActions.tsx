import { useState } from "react";
import { GitBranch, ArrowDown, ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentBranch } from "@/queries/useGitBranches";
import { useGitFetch, useGitPull, useGitPush } from "@/queries/useGitMutations";
import { useWorkspaceTint } from "@/hooks/useWorkspaceTint";
import { GitRepoSelector } from "./GitRepoSelector";

interface RemoteActionsProps {
  localPath: string;
}

export function RemoteActions({ localPath }: RemoteActionsProps) {
  const { data: currentBranch } = useCurrentBranch(localPath);
  const fetchMutation = useGitFetch();
  const pullMutation = useGitPull();
  const pushMutation = useGitPush();
  const [actionError, setActionError] = useState<string | null>(null);
  const tintStyle = useWorkspaceTint();

  return (
    <div
      className="flex shrink-0 items-center gap-2 border-b border-border px-4 h-8"
      data-tauri-drag-region
      style={tintStyle}
    >
      <GitRepoSelector />

      <div className="mx-1 h-4 w-px bg-border" />

      {/* Current branch (read-only) */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <GitBranch className="h-3 w-3" />
        <span className="font-mono truncate max-w-[240px]">
          {currentBranch ?? "..."}
        </span>
      </div>

      <div className="flex-1" data-tauri-drag-region />

      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
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
        className="h-6 px-2 text-xs"
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
        className="h-6 px-2 text-xs"
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

      {actionError && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5">
          <p className="text-xs text-red-400">{actionError}</p>
        </div>
      )}
    </div>
  );
}
