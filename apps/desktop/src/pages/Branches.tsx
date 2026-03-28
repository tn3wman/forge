import { useState } from "react";
import { GitBranch, Plus, Trash2, Check, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { TimeAgo } from "@/components/common/TimeAgo";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useWorkspaces } from "@/queries/useWorkspaces";
import { useGitBranches, useCurrentBranch } from "@/queries/useGitBranches";
import {
  useCreateBranch,
  useCheckoutBranch,
  useDeleteBranch,
  useDeleteRemoteBranch,
  useStashPush,
  useStashApply,
  useStashDrop,
} from "@/queries/useGitMutations";
import { gitIpc } from "@/ipc/git";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceTint } from "@/hooks/useWorkspaceTint";
import { getWorkspaceColor } from "@/lib/workspaceColors";
import { GitRepoSelector } from "@/components/git/GitRepoSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BranchInfo } from "@forge/shared";

export function Branches() {
  const localPath = useWorkspaceStore((s) => s.selectedRepoLocalPath);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { data: workspaces } = useWorkspaces();
  const tintStyle = useWorkspaceTint();
  const activeWorkspace = workspaces?.find((ws) => ws.id === activeWorkspaceId);
  const wsColorHex = activeWorkspace ? getWorkspaceColor(activeWorkspace.color).bg : "#a1a1aa";
  const sectionHeaderStyle = { backgroundColor: `color-mix(in srgb, ${wsColorHex} 10%, transparent)`, borderColor: `color-mix(in srgb, ${wsColorHex} 20%, transparent)` };

  const [localExpanded, setLocalExpanded] = useState(true);
  const [remoteExpanded, setRemoteExpanded] = useState(true);
  const [stashExpanded, setStashExpanded] = useState(true);

  const { data: branches = [], isLoading } = useGitBranches(localPath);
  const { data: currentBranch } = useCurrentBranch(localPath);
  const { data: stashes = [] } = useQuery({
    queryKey: ["git-stash", localPath],
    queryFn: () => gitIpc.stashList(localPath!),
    enabled: !!localPath,
  });

  const createBranch = useCreateBranch();
  const checkoutBranch = useCheckoutBranch();
  const deleteBranch = useDeleteBranch();
  const deleteRemoteBranch = useDeleteRemoteBranch();
  const stashPush = useStashPush();
  const stashApply = useStashApply();
  const stashDrop = useStashDrop();

  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingForceDelete, setPendingForceDelete] = useState<string | null>(null);

  const localBranches = branches.filter((b) => !b.isRemote);
  const remoteBranches = branches.filter((b) => b.isRemote);

  const handleCreate = () => {
    const name = newBranchName.trim();
    if (!name || !localPath) return;
    createBranch.mutate(
      { path: localPath, name },
      {
        onSuccess: () => {
          setNewBranchName("");
          setShowNewBranch(false);
        },
      },
    );
  };

  const handleCheckout = (name: string) => {
    if (!localPath) return;
    setActionError(null);
    checkoutBranch.mutate(
      { path: localPath, name },
      { onError: (err) => setActionError(err instanceof Error ? err.message : String(err)) },
    );
  };

  const handleDelete = (name: string, force?: boolean) => {
    if (!localPath) return;
    setActionError(null);
    deleteBranch.mutate(
      { path: localPath, name, force },
      {
        onError: (err) => {
          const message = err instanceof Error ? err.message : String(err);
          if (message.includes("worktree")) {
            setActionError(message);
            setPendingForceDelete(name);
          } else {
            setActionError(message);
            setPendingForceDelete(null);
          }
        },
      },
    );
  };

  const handleDeleteRemote = (fullName: string) => {
    if (!localPath) return;
    const slashIndex = fullName.indexOf("/");
    if (slashIndex === -1) return;
    const remote = fullName.slice(0, slashIndex);
    const branch = fullName.slice(slashIndex + 1);
    setActionError(null);
    deleteRemoteBranch.mutate(
      { path: localPath, remote, branch },
      { onError: (err) => setActionError(err instanceof Error ? err.message : String(err)) },
    );
  };

  if (!localPath) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <GitBranch className="h-8 w-8" />
        <p className="text-sm">Set a local path to manage branches</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Title bar */}
      <div
        className="flex shrink-0 items-center gap-2 border-b border-border px-4 h-8"
        data-tauri-drag-region
        style={tintStyle}
      >
        <GitRepoSelector />
        <div className="mx-1 h-4 w-px bg-border" />
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground shrink-0">
          Local {localBranches.length}
        </span>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground shrink-0">
          Remote {remoteBranches.length}
        </span>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground shrink-0">
          Stashes {stashes.length}
        </span>

        <div className="flex-1" data-tauri-drag-region />

        <button
          onClick={() => setShowNewBranch(!showNewBranch)}
          className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground hover:bg-accent/80 transition-colors shrink-0"
        >
          <Plus className="h-3 w-3" />
          New Branch
        </button>
      </div>

      {/* New branch input */}
      {showNewBranch && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
          <Input
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Branch name..."
            className="h-7 text-xs max-w-xs"
            autoFocus
          />
          <Button
            variant="secondary"
            size="sm"
            className="h-7 text-xs"
            onClick={handleCreate}
            disabled={!newBranchName.trim() || createBranch.isPending}
          >
            {createBranch.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
          </Button>
        </div>
      )}

      {/* Error */}
      {actionError && (
        <div className="mx-4 my-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5">
          <p className="text-xs text-red-400">{actionError}</p>
          {pendingForceDelete && (
            <Button
              variant="destructive"
              size="sm"
              className="mt-1.5 h-6 text-[10px]"
              onClick={() => {
                const name = pendingForceDelete;
                setPendingForceDelete(null);
                setActionError(null);
                handleDelete(name, true);
              }}
            >
              Force Delete (removes worktree)
            </Button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Loading branches...</span>
        </div>
      ) : (
        <div className="flex flex-1 flex-col min-h-0" style={{ "--panel-height": "calc((100% - 78px) / 3)" } as React.CSSProperties}>
          {/* Local Branches — accordion panel */}
          <button
            onClick={() => setLocalExpanded(!localExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider border-b shrink-0 cursor-pointer hover:brightness-110 transition-all"
            style={sectionHeaderStyle}
          >
            {localExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Local Branches ({localBranches.length})
          </button>
          {localExpanded && (
            <div className="min-h-0 overflow-y-auto" style={{ height: "var(--panel-height)" }}>
              {localBranches.map((branch) => (
                <BranchRow
                  key={branch.name}
                  branch={branch}
                  isCurrent={branch.isHead}
                  onCheckout={() => handleCheckout(branch.name)}
                  onDelete={() => handleDelete(branch.name)}
                  checkoutPending={checkoutBranch.isPending}
                />
              ))}
              {localBranches.length === 0 && (
                <p className="px-3 py-3 text-xs text-muted-foreground text-center">No local branches</p>
              )}
            </div>
          )}

          {/* Remote Branches — accordion panel */}
          <button
            onClick={() => setRemoteExpanded(!remoteExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider border-b shrink-0 cursor-pointer hover:brightness-110 transition-all"
            style={sectionHeaderStyle}
          >
            {remoteExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Remote Branches ({remoteBranches.length})
          </button>
          {remoteExpanded && (
            <div className="min-h-0 overflow-y-auto" style={{ height: "var(--panel-height)" }}>
              {remoteBranches.map((branch) => (
                <BranchRow
                  key={branch.name}
                  branch={branch}
                  isCurrent={false}
                  isRemote
                  onDelete={() => handleDeleteRemote(branch.name)}
                />
              ))}
              {remoteBranches.length === 0 && (
                <p className="px-3 py-3 text-xs text-muted-foreground text-center">No remote branches</p>
              )}
            </div>
          )}

          {/* Stashes — accordion panel */}
          <button
            onClick={() => setStashExpanded(!stashExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider border-b shrink-0 cursor-pointer hover:brightness-110 transition-all"
            style={sectionHeaderStyle}
          >
            {stashExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Stashes ({stashes.length})
            {localPath && (
              <span
                className="ml-auto text-[10px] normal-case tracking-normal text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  stashPush.mutate({ path: localPath });
                }}
              >
                + Stash Changes
              </span>
            )}
          </button>
          {stashExpanded && (
            <div className="min-h-0 overflow-y-auto" style={{ height: "var(--panel-height)" }}>
              {stashes.length === 0 ? (
                <p className="px-3 py-3 text-xs text-muted-foreground text-center">No stashes</p>
              ) : (
                stashes.map((stash) => (
                  <div
                    key={stash.index}
                    className="flex items-center gap-2 px-3 h-8 text-xs hover:bg-accent/50 border-b border-border/50"
                  >
                    {/* Icon column — matches branch icon */}
                    <GitBranch className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground font-mono shrink-0">
                      stash@{"{" + stash.index + "}"}
                    </span>
                    <span className="flex-1 min-w-0 truncate">{stash.message}</span>
                    {/* Spacers to align with branch columns: upstream + merged + hash + time */}
                    <div className="w-[220px] shrink-0" />
                    <div className="w-[50px] shrink-0" />
                    <div className="w-[55px] shrink-0" />
                    <div className="w-[55px] shrink-0" />
                    {/* Actions — same w-[52px] as branch rows */}
                    <div className="w-[52px] shrink-0 flex items-center justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => localPath && stashApply.mutate({ path: localPath, index: stash.index })}
                        title="Apply"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-destructive hover:text-destructive"
                        onClick={() => localPath && stashDrop.mutate({ path: localPath, index: stash.index })}
                        title="Drop"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BranchRow({
  branch,
  isCurrent,
  isRemote,
  onCheckout,
  onDelete,
  checkoutPending,
}: {
  branch: BranchInfo;
  isCurrent: boolean;
  isRemote?: boolean;
  onCheckout?: () => void;
  onDelete?: () => void;
  checkoutPending?: boolean;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 h-8 text-xs hover:bg-accent/50 border-b border-border/50",
        isCurrent && "bg-accent/30",
      )}
    >
      {isCurrent ? (
        <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
      ) : (
        <GitBranch className="h-3 w-3 shrink-0 text-muted-foreground" />
      )}
      <span className="min-w-0 flex-1 truncate font-mono text-xs">
        {branch.name}
      </span>
      {/* Upstream — fixed width, left-aligned */}
      <span className="w-[220px] shrink-0 text-[10px] text-muted-foreground truncate">
        {branch.upstream && !isRemote ? `→ ${branch.upstream}` : ""}
      </span>
      {/* Merged — fixed width so column stays aligned */}
      <div className="w-[50px] shrink-0">
        {branch.isMerged && (
          <span className="rounded-full bg-purple-500/15 px-1.5 py-0 text-[10px] font-medium text-purple-400 leading-4">
            merged
          </span>
        )}
      </div>
      <span className="w-[55px] shrink-0 font-mono text-xs text-blue-400 text-right">
        {branch.commitOid.slice(0, 7)}
      </span>
      <div className="w-[55px] shrink-0 text-right">
        <TimeAgo date={new Date(branch.commitTimestamp * 1000).toISOString()} />
      </div>
      {/* Actions — fixed width so columns align even for current branch */}
      <div className="w-[52px] shrink-0 flex items-center justify-end gap-0.5">
        {!isCurrent && onCheckout && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onCheckout}
            disabled={checkoutPending}
            title="Checkout"
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
        {!isCurrent && onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
