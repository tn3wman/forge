import { ArrowLeft, Loader2, CircleDot, CheckCircle2, GitPullRequest } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useIssueDetail } from "@/queries/useIssueDetail";
import { useAddComment } from "@/queries/useMutations";
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
  const addComment = useAddComment();

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
          <h1 className="text-sm font-semibold truncate">
            #{issue.number}: {issue.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            {selectedRepoFullName}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {issue.body && <MarkdownBody content={issue.body} />}
          <Separator />
          <CommentThread events={issue.timeline} />
          <CommentEditor onSubmit={handleAddComment} isSubmitting={addComment.isPending} />
        </div>

        {/* Right sidebar */}
        <div className="w-64 border-l overflow-y-auto shrink-0 p-4 space-y-4">
          {/* Assignees */}
          {issue.assignees.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Assignees</h3>
              <div className="space-y-1">
                {issue.assignees.map((assignee) => (
                  <div key={assignee} className="text-xs text-foreground">{assignee}</div>
                ))}
              </div>
            </div>
          )}

          {/* Labels */}
          {issue.labels.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Labels</h3>
              <div className="flex flex-wrap gap-1">
                {issue.labels.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Linked Pull Requests */}
          {issue.linkedPullRequests && issue.linkedPullRequests.length > 0 && (
            <div className="mb-4">
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
