import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Loader2, CircleDot, CheckCircle2, GitPullRequest, Pencil, Lock, Unlock, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useIssueDetail, useRepoLabels, useRepoAssignees } from "@/queries/useIssueDetail";
import {
  useAddComment,
  useCloseIssue,
  useReopenIssue,
  useUpdateIssue,
  useLockIssue,
  useUnlockIssue,
  useSetIssueLabels,
  useSetIssueAssignees,
} from "@/queries/useMutations";
import { MarkdownBody } from "@/components/common/MarkdownBody";
import { CommentThread } from "@/components/comment/CommentThread";
import { CommentEditor } from "@/components/comment/CommentEditor";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TimeAgo } from "@/components/common/TimeAgo";

export function IssueDetail() {
  const { selectedRepoFullName, selectedIssueNumber, goBack, navigateToPr } = useWorkspaceStore();

  const [owner, repo] = selectedRepoFullName?.split("/") ?? [null, null];

  const { data: issue, isLoading, error } = useIssueDetail(owner, repo, selectedIssueNumber);
  const { data: repoLabels } = useRepoLabels(owner, repo);
  const { data: repoAssignees } = useRepoAssignees(owner, repo);

  const addComment = useAddComment();
  const closeIssue = useCloseIssue();
  const reopenIssue = useReopenIssue();
  const updateIssue = useUpdateIssue();
  const lockIssue = useLockIssue();
  const unlockIssue = useUnlockIssue();
  const setLabels = useSetIssueLabels();
  const setAssignees = useSetIssueAssignees();

  // Edit states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [isEditingLabels, setIsEditingLabels] = useState(false);
  const [isEditingAssignees, setIsEditingAssignees] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Loading issue...</span>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p className="text-sm text-destructive">Failed to load issue</p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={goBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Go back
        </Button>
      </div>
    );
  }

  const handleAddComment = (body: string) => {
    if (!owner || !repo || selectedIssueNumber == null) return;
    addComment.mutate({ owner, repo, number: selectedIssueNumber, body });
  };

  const handleClose = () => {
    if (!owner || !repo || selectedIssueNumber == null) return;
    closeIssue.mutate({ owner, repo, number: selectedIssueNumber });
  };

  const handleReopen = () => {
    if (!owner || !repo || selectedIssueNumber == null) return;
    reopenIssue.mutate({ owner, repo, number: selectedIssueNumber });
  };

  const handleSaveTitle = () => {
    if (!owner || !repo || selectedIssueNumber == null || !editTitle.trim()) return;
    updateIssue.mutate(
      { owner, repo, number: selectedIssueNumber, title: editTitle.trim() },
      { onSuccess: () => setIsEditingTitle(false) },
    );
  };

  const handleStartEditTitle = () => {
    setEditTitle(issue.title);
    setIsEditingTitle(true);
  };

  const handleStartEditBody = () => {
    setEditBody(issue.body || "");
    setIsEditingBody(true);
  };

  const handleSaveBody = () => {
    if (!owner || !repo || selectedIssueNumber == null) return;
    updateIssue.mutate(
      { owner, repo, number: selectedIssueNumber, body: editBody },
      { onSuccess: () => setIsEditingBody(false) },
    );
  };

  const handleToggleLock = () => {
    if (!owner || !repo || selectedIssueNumber == null) return;
    if (issue.locked) {
      unlockIssue.mutate({ owner, repo, number: selectedIssueNumber });
    } else {
      lockIssue.mutate({ owner, repo, number: selectedIssueNumber });
    }
  };

  const handleToggleLabel = (labelName: string) => {
    if (!owner || !repo || selectedIssueNumber == null) return;
    const current = issue.labels || [];
    const next = current.includes(labelName)
      ? current.filter((l) => l !== labelName)
      : [...current, labelName];
    setLabels.mutate({ owner, repo, number: selectedIssueNumber, labels: next });
  };

  const handleToggleAssignee = (login: string) => {
    if (!owner || !repo || selectedIssueNumber == null) return;
    const current = issue.assignees || [];
    const next = current.includes(login)
      ? current.filter((a) => a !== login)
      : [...current, login];
    setAssignees.mutate({ owner, repo, number: selectedIssueNumber, assignees: next });
  };

  const StateIcon = issue.state === "closed" ? CheckCircle2 : CircleDot;
  const stateColor = issue.state === "closed" ? "text-purple-400" : "text-green-400";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
        <Button variant="ghost" size="sm" onClick={goBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <StateIcon className={cn("h-5 w-5 shrink-0", stateColor)} />
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                ref={titleInputRef}
                className="flex-1 bg-transparent border border-border rounded px-2 py-1 text-sm font-semibold outline-none focus:border-ring"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") setIsEditingTitle(false);
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveTitle}
                disabled={updateIssue.isPending}
                className="h-7 w-7 p-0"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingTitle(false)}
                className="h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-sm font-semibold truncate">
                #{issue.number}: {issue.title}
              </h1>
              <button
                onClick={handleStartEditTitle}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded"
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {selectedRepoFullName}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {issue.locked ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleLock}
              disabled={unlockIssue.isPending}
            >
              <Unlock className="h-3.5 w-3.5 mr-1" />
              {unlockIssue.isPending ? "Unlocking..." : "Unlock"}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleLock}
              disabled={lockIssue.isPending}
            >
              <Lock className="h-3.5 w-3.5 mr-1" />
              {lockIssue.isPending ? "Locking..." : "Lock"}
            </Button>
          )}
          {issue.state === "open" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={closeIssue.isPending}
            >
              {closeIssue.isPending ? "Closing..." : "Close issue"}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReopen}
              disabled={reopenIssue.isPending}
            >
              {reopenIssue.isPending ? "Reopening..." : "Reopen issue"}
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isEditingBody ? (
            <div className="space-y-2">
              <textarea
                className="w-full min-h-[200px] bg-transparent border border-border rounded p-3 text-sm outline-none focus:border-ring resize-y font-mono"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveBody}
                  disabled={updateIssue.isPending}
                >
                  {updateIssue.isPending ? "Saving..." : "Save"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingBody(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="group relative">
              {issue.body ? (
                <MarkdownBody content={issue.body} />
              ) : (
                <p className="text-sm text-muted-foreground italic">No description provided.</p>
              )}
              <button
                onClick={handleStartEditBody}
                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded"
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          )}
          <Separator />
          <CommentThread events={issue.timeline} />
          {!issue.locked ? (
            <CommentEditor onSubmit={handleAddComment} isSubmitting={addComment.isPending} />
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground border border-border rounded p-3">
              <Lock className="h-4 w-4" />
              <span>This issue is locked. Only collaborators can comment.</span>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-64 border-l overflow-y-auto shrink-0 p-4 space-y-4">
          {/* Assignees */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-muted-foreground">Assignees</h3>
              <button
                onClick={() => setIsEditingAssignees(!isEditingAssignees)}
                className="p-0.5 hover:bg-accent rounded"
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
            {isEditingAssignees && repoAssignees ? (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {repoAssignees.map((login) => (
                  <button
                    key={login}
                    onClick={() => handleToggleAssignee(login)}
                    className={cn(
                      "flex items-center gap-2 w-full text-left rounded px-1.5 py-1 text-xs transition-colors",
                      issue.assignees.includes(login)
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50",
                    )}
                    disabled={setAssignees.isPending}
                  >
                    <span className={cn(
                      "w-3 h-3 rounded-sm border flex items-center justify-center shrink-0",
                      issue.assignees.includes(login) ? "bg-primary border-primary" : "border-border",
                    )}>
                      {issue.assignees.includes(login) && <Check className="h-2 w-2 text-primary-foreground" />}
                    </span>
                    {login}
                  </button>
                ))}
              </div>
            ) : issue.assignees.length > 0 ? (
              <div className="space-y-1">
                {issue.assignees.map((assignee) => (
                  <div key={assignee} className="text-xs text-foreground">{assignee}</div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">None</p>
            )}
          </div>

          {/* Labels */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-muted-foreground">Labels</h3>
              <button
                onClick={() => setIsEditingLabels(!isEditingLabels)}
                className="p-0.5 hover:bg-accent rounded"
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
            {isEditingLabels && repoLabels ? (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {repoLabels.map((label) => (
                  <button
                    key={label.name}
                    onClick={() => handleToggleLabel(label.name)}
                    className={cn(
                      "flex items-center gap-2 w-full text-left rounded px-1.5 py-1 text-xs transition-colors",
                      issue.labels.includes(label.name)
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50",
                    )}
                    disabled={setLabels.isPending}
                  >
                    <span className={cn(
                      "w-3 h-3 rounded-sm border flex items-center justify-center shrink-0",
                      issue.labels.includes(label.name) ? "bg-primary border-primary" : "border-border",
                    )}>
                      {issue.labels.includes(label.name) && <Check className="h-2 w-2 text-primary-foreground" />}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: `#${label.color}` }}
                    />
                    {label.name}
                  </button>
                ))}
              </div>
            ) : issue.labels.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {issue.labels.map((label) => {
                  const labelInfo = repoLabels?.find((l) => l.name === label);
                  return (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={labelInfo ? {
                        backgroundColor: `#${labelInfo.color}20`,
                        color: `#${labelInfo.color}`,
                        border: `1px solid #${labelInfo.color}40`,
                      } : undefined}
                    >
                      {labelInfo && (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: `#${labelInfo.color}` }}
                        />
                      )}
                      {label}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">None</p>
            )}
          </div>

          {/* Lock status */}
          {issue.locked && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Lock Status</h3>
              <div className="flex items-center gap-1.5 text-xs text-amber-400">
                <Lock className="h-3 w-3" />
                <span>Locked{issue.activeLockReason ? ` (${issue.activeLockReason})` : ""}</span>
              </div>
            </div>
          )}

          {/* Linked Pull Requests */}
          {issue.linkedPullRequests && issue.linkedPullRequests.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Linked Pull Requests</h3>
              <div className="space-y-1">
                {issue.linkedPullRequests.map((pr) => (
                  <button
                    key={`${pr.repoFullName}-${pr.number}`}
                    className="flex items-center gap-2 w-full text-left hover:bg-accent/50 rounded px-1.5 py-1 -mx-1.5 transition-colors"
                    onClick={() => navigateToPr(pr.repoFullName, pr.number)}
                  >
                    <GitPullRequest className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      pr.state === "merged" ? "text-purple-400" : pr.state === "closed" ? "text-red-400" : "text-green-400"
                    )} />
                    <span className="text-xs truncate">{pr.title}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">#{pr.number}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Created</h3>
            <TimeAgo date={issue.createdAt} />
          </div>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Updated</h3>
            <TimeAgo date={issue.updatedAt} />
          </div>
        </div>
      </div>
    </div>
  );
}
