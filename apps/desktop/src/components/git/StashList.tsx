import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Archive, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { gitIpc } from "@/ipc/git";
import {
  useStashPush,
  useStashPop,
  useStashApply,
  useStashDrop,
} from "@/queries/useGitMutations";
import type { StashEntry } from "@forge/shared";

interface StashListProps {
  localPath: string;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp * 1000;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return `${Math.floor(diffDay / 30)}mo ago`;
}

export function StashList({ localPath }: StashListProps) {
  const {
    data: stashes = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["git-stash", localPath],
    queryFn: () => gitIpc.stashList(localPath),
  });

  const stashPush = useStashPush();
  const stashPop = useStashPop();
  const stashApply = useStashApply();
  const stashDrop = useStashDrop();

  const [showNewStash, setShowNewStash] = useState(false);
  const [stashMessage, setStashMessage] = useState("");
  const [includeUntracked, setIncludeUntracked] = useState(false);

  const handleStashPush = () => {
    stashPush.mutate(
      {
        path: localPath,
        message: stashMessage.trim() || undefined,
        includeUntracked,
      },
      {
        onSuccess: () => {
          setStashMessage("");
          setShowNewStash(false);
          setIncludeUntracked(false);
        },
      },
    );
  };

  const handlePop = (index: number) => {
    stashPop.mutate({ path: localPath, index });
  };

  const handleApply = (index: number) => {
    stashApply.mutate({ path: localPath, index });
  };

  const handleDrop = (index: number) => {
    if (!window.confirm(`Drop stash@{${index}}?`)) return;
    stashDrop.mutate({ path: localPath, index });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading stashes...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Failed to load stashes: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-sm font-medium">Stashes</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNewStash(!showNewStash)}
        >
          <Plus className="h-4 w-4" />
          Stash Changes
        </Button>
      </div>

      {showNewStash && (
        <div className="space-y-2 px-3 pb-2">
          <Input
            value={stashMessage}
            onChange={(e) => setStashMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStashPush()}
            placeholder="Stash message (optional)..."
            className="h-7 text-xs"
            autoFocus
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={includeUntracked}
                onChange={(e) => setIncludeUntracked(e.target.checked)}
                className="rounded"
              />
              Include untracked
            </label>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleStashPush}
              disabled={stashPush.isPending}
            >
              {stashPush.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Stash"
              )}
            </Button>
          </div>
        </div>
      )}

      {stashes.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">No stashes</p>
      ) : (
        <div>
          {stashes.map((stash) => (
            <StashRow
              key={stash.index}
              stash={stash}
              onApply={() => handleApply(stash.index)}
              onPop={() => handlePop(stash.index)}
              onDrop={() => handleDrop(stash.index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StashRow({
  stash,
  onApply,
  onPop,
  onDrop,
}: {
  stash: StashEntry;
  onApply: () => void;
  onPop: () => void;
  onDrop: () => void;
}) {
  return (
    <div className="group flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent">
      <Archive className="h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        stash@{"{"}
        {stash.index}
        {"}"}
      </span>
      <span className="min-w-0 flex-1 truncate">{stash.message}</span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatRelativeTime(stash.timestamp)}
      </span>
      <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-xs"
          onClick={onApply}
          title="Apply"
        >
          Apply
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-xs"
          onClick={onPop}
          title="Pop"
        >
          Pop
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-xs text-destructive hover:text-destructive"
          onClick={onDrop}
          title="Drop"
        >
          Drop
        </Button>
      </div>
    </div>
  );
}
