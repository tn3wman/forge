import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Check,
  Loader2,
  AlertCircle,
  GitBranch,
  FolderTree,
  Upload,
  GitPullRequest,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useStartWork, type StartWorkStep } from "@/hooks/useStartWork";
import { useRepositories } from "@/queries/useRepositories";
import { useGitBranches } from "@/queries/useGitBranches";
import { useGitWorktrees } from "@/queries/useGitWorktrees";
import { useIssueDetail } from "@/queries/useIssueDetail";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { useAuthStore } from "@/stores/authStore";
import { gitIpc } from "@/ipc/git";
import type { Issue } from "@forge/shared";
import type { LinkedPrSummary } from "@/hooks/useLinkedItems";

interface StartWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issue: Issue;
  linkedPrs?: LinkedPrSummary[];
}

const PROGRESS_STEPS: { key: StartWorkStep; label: string; icon: React.ElementType }[] = [
  { key: "fetching", label: "Syncing remote refs", icon: RefreshCw },
  { key: "creating-branch", label: "Creating branch", icon: GitBranch },
  { key: "creating-worktree", label: "Creating worktree", icon: FolderTree },
  { key: "pushing", label: "Pushing to remote", icon: Upload },
  { key: "creating-pr", label: "Creating draft PR", icon: GitPullRequest },
];

function getStepIndex(step: StartWorkStep): number {
  return PROGRESS_STEPS.findIndex((s) => s.key === step);
}

export function StartWorkDialog({ open, onOpenChange, issue, linkedPrs }: StartWorkDialogProps) {
  const { activeWorkspaceId } = useWorkspaceStore();
  const { data: repos } = useRepositories(activeWorkspaceId);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Find the repo for this issue
  const repo = useMemo(
    () => repos?.find((r) => r.fullName === issue.repoFullName),
    [repos, issue.repoFullName],
  );

  const [owner, repoName] = useMemo(
    () => (issue.repoFullName ? issue.repoFullName.split("/") : [null, null]),
    [issue.repoFullName],
  );

  const [baseBranch, setBaseBranch] = useState<string>("");
  const [phase, setPhase] = useState<"configure" | "creating" | "done" | "error">("configure");
  const [syncNeeded, setSyncNeeded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: branches } = useGitBranches(repo?.localPath ?? null);
  const { data: worktrees } = useGitWorktrees(repo?.localPath ?? null);

  // Fetch issue detail — uses CrossReferencedEvent which catches ALL referencing PRs,
  // not just those with closingIssuesReferences
  const { data: issueDetail } = useIssueDetail(owner, repoName, issue.number);

  const { step, error, result, execute, reset } = useStartWork();

  const branchName = `forge/issue-${issue.number}`;

  // Detect existing worktree by matching ALL linked PR branches and the forge naming pattern
  const existingWorktree = useMemo(() => {
    if (!worktrees) return undefined;

    // Collect all known branch names associated with this issue
    const knownBranches = new Set<string>();
    knownBranches.add(branchName); // forge/issue-{N} pattern

    // From the list-view linked PRs (closingIssuesReferences on the PR side)
    if (linkedPrs) {
      for (const pr of linkedPrs) {
        if (pr.headRef) knownBranches.add(pr.headRef);
      }
    }

    // From issue detail's linked PRs (CrossReferencedEvent — catches ALL referencing PRs)
    if (issueDetail?.linkedPullRequests) {
      for (const pr of issueDetail.linkedPullRequests) {
        if (pr.headRef) knownBranches.add(pr.headRef);
      }
    }

    return worktrees.find((wt) => !wt.isMain && wt.branch && knownBranches.has(wt.branch));
  }, [worktrees, branchName, linkedPrs, issueDetail]);

  // Set default base branch — verify it exists locally before using GitHub API value
  useEffect(() => {
    if (baseBranch || !branches) return;
    const localNames = branches.filter((b) => !b.isRemote).map((b) => b.name);
    if (repo?.defaultBranch && localNames.includes(repo.defaultBranch)) {
      setBaseBranch(repo.defaultBranch);
    } else if (localNames.includes("main")) {
      setBaseBranch("main");
    } else if (localNames.includes("master")) {
      setBaseBranch("master");
    } else if (localNames.length > 0) {
      setBaseBranch(localNames[0]);
    }
  }, [repo?.defaultBranch, baseBranch, branches]);

  // Check if local base branch is behind remote
  useEffect(() => {
    if (!branches || !baseBranch) return;
    const local = branches.find((b) => b.name === baseBranch && !b.isRemote);
    const remote = branches.find(
      (b) => b.name === `origin/${baseBranch}` && b.isRemote,
    );
    if (local && remote && local.commitOid !== remote.commitOid) {
      setSyncNeeded(true);
    } else {
      setSyncNeeded(false);
    }
  }, [branches, baseBranch]);

  // Track step changes → update phase
  useEffect(() => {
    if (step === "done") setPhase("done");
    else if (step === "error") setPhase("error");
    else if (step !== "idle") setPhase("creating");
  }, [step]);

  // Reset when dialog opens — clear baseBranch so the default-setting effect re-runs
  useEffect(() => {
    if (open) {
      reset();
      setPhase("configure");
      setBaseBranch("");
    }
  }, [open, reset]);

  const hasLinkedPr = linkedPrs && linkedPrs.length > 0;

  const handleSync = useCallback(async () => {
    if (!repo?.localPath || !isAuthenticated || !baseBranch) return;
    setSyncing(true);
    setSyncError(null);
    try {
      await gitIpc.syncBranch(repo.localPath, "origin", baseBranch);
      await queryClient.invalidateQueries({ queryKey: ["git-branches", repo.localPath] });
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : String(err));
    }
    setSyncing(false);
  }, [repo?.localPath, isAuthenticated, baseBranch, queryClient]);

  const handleStart = async () => {
    if (!repo?.localPath || !owner || !repoName) return;

    setPhase("creating");
    const finalResult = await execute({
      repoLocalPath: repo.localPath,
      owner,
      repo: repoName,
      baseBranch,
      issueNumber: issue.number,
      issueTitle: issue.title,
    });

    // Auto-open terminal on success
    if (finalResult && activeWorkspaceId) {
      useTerminalStore.getState().addPreSessionTab(activeWorkspaceId, {
        label: finalResult.branchName,
        workingDirectory: finalResult.worktreePath,
      });
      useWorkspaceStore.getState().setActivePage("home");
      onOpenChange(false);
    }
  };

  const handleResume = () => {
    if (!existingWorktree || !activeWorkspaceId) return;
    useTerminalStore.getState().addPreSessionTab(activeWorkspaceId, {
      label: existingWorktree.branch ?? branchName,
      workingDirectory: existingWorktree.path,
    });
    useWorkspaceStore.getState().setActivePage("home");
    onOpenChange(false);
  };

  const handleRetry = () => {
    reset();
    setPhase("configure");
  };

  const localBranches = useMemo(
    () => branches?.filter((b) => !b.isRemote) ?? [],
    [branches],
  );

  const remoteRefMissing = useMemo(() => {
    if (!branches || !baseBranch) return false;
    return !branches.some((b) => b.isRemote && b.name === `origin/${baseBranch}`);
  }, [branches, baseBranch]);

  const noLocalPath = !repo?.localPath;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Start Work</DialogTitle>
          <DialogDescription className="text-xs">
            #{issue.number} {issue.title}
          </DialogDescription>
        </DialogHeader>

        {/* No local path */}
        {noLocalPath && (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Repository not cloned locally. Clone it first from the repo settings.
            </p>
          </div>
        )}

        {/* Configure phase */}
        {!noLocalPath && phase === "configure" && (
          <div className="space-y-4">
            {/* Existing worktree detected */}
            {existingWorktree && (
              <div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 space-y-2">
                <div className="flex items-start gap-2">
                  <FolderTree className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-blue-400 font-medium">Existing worktree found</p>
                    <p className="text-[10px] text-blue-400/70 mt-0.5">
                      Branch <code className="font-mono">{existingWorktree.branch}</code> has a worktree at{" "}
                      <code className="font-mono">{existingWorktree.path}</code>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={handleResume}>
                    Open Terminal
                  </Button>
                </div>
              </div>
            )}

            {/* Existing linked PR notice */}
            {hasLinkedPr && (
              <div className="rounded-md border border-border bg-accent/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  This issue already has {linkedPrs.length} linked PR(s). Starting work will create a new branch and PR.
                </p>
              </div>
            )}

            {/* Base branch selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Base branch</label>
              <select
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {localBranches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Remote ref missing warning */}
            {remoteRefMissing && !syncNeeded && (
              <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
                <p className="text-xs text-yellow-500">
                  Remote tracking branch &apos;origin/{baseBranch}&apos; not found locally. The correct remote branch will be resolved automatically when starting work.
                </p>
              </div>
            )}

            {/* Sync warning */}
            {(syncNeeded || syncError) && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
                  <p className="text-xs text-yellow-500 flex-1">
                    Local branch is behind remote.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={syncing}
                    className="h-6 text-[10px]"
                  >
                    {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sync"}
                  </Button>
                </div>
                {syncError && (
                  <p className="text-xs text-destructive px-1">
                    Sync failed: {syncError}
                  </p>
                )}
              </div>
            )}

            {/* Branch preview */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">New branch</label>
              <div className="flex items-center gap-2 rounded-md border border-border bg-accent/30 px-3 py-1.5">
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                <code className="text-xs font-mono">{branchName}</code>
              </div>
            </div>

            {/* Start button */}
            <div className="flex justify-end">
              <Button size="sm" onClick={handleStart}>
                Start Work
              </Button>
            </div>
          </div>
        )}

        {/* Creating phase */}
        {!noLocalPath && (phase === "creating" || phase === "done") && (
          <div className="space-y-2 py-2">
            {PROGRESS_STEPS.map((ps, i) => {
              const currentIdx = getStepIndex(step);
              const isDone = phase === "done" || i < currentIdx;
              const isActive = i === currentIdx && phase === "creating";
              const isPending = i > currentIdx && phase !== "done";
              const Icon = ps.icon;

              return (
                <div key={ps.key} className="flex items-center gap-3 px-1">
                  <div className="w-5 h-5 flex items-center justify-center">
                    {isDone && <Check className="h-4 w-4 text-green-400" />}
                    {isActive && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                    {isPending && <Icon className="h-4 w-4 text-muted-foreground/40" />}
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      isDone && "text-foreground",
                      isActive && "text-foreground font-medium",
                      isPending && "text-muted-foreground/50",
                    )}
                  >
                    {ps.label}
                  </span>
                </div>
              );
            })}

            {/* Done summary */}
            {phase === "done" && result && (
              <div className="mt-4 space-y-2 rounded-md border border-border bg-accent/30 p-3">
                <div className="flex items-center gap-2 text-xs">
                  <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                  <code className="font-mono">{result.branchName}</code>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <GitPullRequest className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Draft PR #{result.prNumber}</span>
                  {result.prUrl && (
                    <a
                      className="text-blue-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                      role="link"
                      onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        try {
                          const { openUrl } = await import("@tauri-apps/plugin-opener");
                          await openUrl(result.prUrl!);
                        } catch {
                          window.open(result.prUrl, "_blank");
                        }
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Terminal opened with worktree at {result.worktreePath}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error phase */}
        {phase === "error" && (
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
