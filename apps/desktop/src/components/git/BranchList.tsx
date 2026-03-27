import { useState } from "react";
import {
  GitBranch,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGitBranches, useCurrentBranch } from "@/queries/useGitBranches";
import {
  useCreateBranch,
  useCheckoutBranch,
  useDeleteBranch,
  useDeleteRemoteBranch,
} from "@/queries/useGitMutations";
import { cn } from "@/lib/utils";
import type { BranchInfo } from "@forge/shared";

interface BranchListProps {
  localPath: string;
}

export function BranchList({ localPath }: BranchListProps) {
  const { data: branches = [], isLoading, error } = useGitBranches(localPath);
  const { data: currentBranch } = useCurrentBranch(localPath);

  const createBranch = useCreateBranch();
  const checkoutBranch = useCheckoutBranch();
  const deleteBranch = useDeleteBranch();
  const deleteRemoteBranch = useDeleteRemoteBranch();

  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [localExpanded, setLocalExpanded] = useState(true);
  const [remoteExpanded, setRemoteExpanded] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingForceDelete, setPendingForceDelete] = useState<string | null>(null);

  const localBranches = branches.filter((b) => !b.isRemote);
  const remoteBranches = branches.filter((b) => b.isRemote);

  const handleCreate = () => {
    const name = newBranchName.trim();
    if (!name) return;
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
    setActionError(null);
    checkoutBranch.mutate(
      { path: localPath, name },
      { onError: (err) => setActionError(err instanceof Error ? err.message : String(err)) },
    );
  };

  const handleDelete = (name: string, force?: boolean) => {
    const msg = force
      ? `This will remove the worktree and delete branch "${name}". Continue?`
      : `Delete branch "${name}"?`;
    if (!window.confirm(msg)) return;
    setActionError(null);
    deleteBranch.mutate(
      { path: localPath, name, force },
      {
        onError: (err) => {
          const message = err instanceof Error ? err.message : String(err);
          // If it's a worktree conflict, offer force delete
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
    // Parse "origin/feature-x" → remote: "origin", branch: "feature-x"
    const slashIndex = fullName.indexOf("/");
    if (slashIndex === -1) return;
    const remote = fullName.slice(0, slashIndex);
    const branch = fullName.slice(slashIndex + 1);

    if (!window.confirm(`Delete remote branch '${fullName}'? This will remove it from the remote repository.`)) return;
    setActionError(null);
    deleteRemoteBranch.mutate(
      { path: localPath, remote, branch },
      {
        onError: (err) => {
          setActionError(err instanceof Error ? err.message : String(err));
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading branches...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Failed to load branches: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* New Branch */}
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-sm font-medium">Branches</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNewBranch(!showNewBranch)}
        >
          <Plus className="h-4 w-4" />
          New Branch
        </Button>
      </div>

      {showNewBranch && (
        <div className="flex items-center gap-2 px-3 pb-2">
          <Input
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Branch name..."
            className="h-7 text-xs"
            autoFocus
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCreate}
            disabled={!newBranchName.trim() || createBranch.isPending}
          >
            {createBranch.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "Create"
            )}
          </Button>
        </div>
      )}

      {/* Error display */}
      {actionError && (
        <div className="mx-3 mb-1 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5">
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

      {/* Local Branches */}
      <CollapsibleSection
        label={`Local Branches (${localBranches.length})`}
        expanded={localExpanded}
        onToggle={() => setLocalExpanded(!localExpanded)}
      >
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
          <p className="px-3 py-1 text-xs text-muted-foreground">
            No local branches
          </p>
        )}
      </CollapsibleSection>

      {/* Remote Branches */}
      <CollapsibleSection
        label={`Remote Branches (${remoteBranches.length})`}
        expanded={remoteExpanded}
        onToggle={() => setRemoteExpanded(!remoteExpanded)}
      >
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
          <p className="px-3 py-1 text-xs text-muted-foreground">
            No remote branches
          </p>
        )}
      </CollapsibleSection>
    </div>
  );
}

function CollapsibleSection({
  label,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {label}
      </button>
      {expanded && <div>{children}</div>}
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
        "group flex items-center gap-2 px-3 py-1 text-xs hover:bg-accent",
        isCurrent && "bg-accent/50",
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
      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        {branch.commitOid.slice(0, 7)}
      </span>
      {!isCurrent && (
        <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
          {onCheckout && (
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
          {onDelete && (
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
      )}
    </div>
  );
}
