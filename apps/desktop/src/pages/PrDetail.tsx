import { useState } from "react";
import { ArrowLeft, Loader2, GitPullRequest, GitMerge, GitPullRequestClosed, Plus, Minus, CheckCircle2, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { usePrDetail, usePrCommits, usePrFiles } from "@/queries/usePrDetail";
import { useAddComment, useSubmitReview, useMergePr, useClosePr, useReopenPr } from "@/queries/useMutations";
import { MarkdownBody } from "@/components/common/MarkdownBody";
import { CommentThread } from "@/components/comment/CommentThread";
import { CommentEditor } from "@/components/comment/CommentEditor";
import { DiffViewer } from "@/components/diff/DiffViewer";
import { DiffFileTree } from "@/components/diff/DiffFileTree";
import { ReviewForm } from "@/components/github/ReviewForm";
import { MergeButton } from "@/components/github/MergeButton";
import { StatusChecks } from "@/components/github/StatusChecks";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TimeAgo } from "@/components/common/TimeAgo";

type Tab = "conversation" | "commits" | "files";

export function PrDetail() {
  const { selectedRepoFullName, selectedPrNumber, goBack, navigateToIssue } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState<Tab>("conversation");
  const [selectedFile, setSelectedFile] = useState<string | undefined>();

  const [owner, repo] = selectedRepoFullName?.split("/") ?? [null, null];

  const { data: pr, isLoading, error } = usePrDetail(owner, repo, selectedPrNumber);
  const { data: commits } = usePrCommits(owner, repo, selectedPrNumber);
  const { data: files } = usePrFiles(owner, repo, selectedPrNumber);

  const addComment = useAddComment();
  const submitReview = useSubmitReview();
  const mergePr = useMergePr();
  const closePr = useClosePr();
  const reopenPr = useReopenPr();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Loading pull request...</span>
      </div>
    );
  }

  if (error || !pr) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p className="text-sm text-destructive">Failed to load pull request</p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={goBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Go back
        </Button>
      </div>
    );
  }

  const handleAddComment = (body: string) => {
    if (!owner || !repo || selectedPrNumber == null) return;
    addComment.mutate({ owner, repo, number: selectedPrNumber, body });
  };

  const handleSubmitReview = (event: string, body: string) => {
    if (!owner || !repo || selectedPrNumber == null) return;
    submitReview.mutate({ owner, repo, number: selectedPrNumber, event, body });
  };

  const handleMerge = (method: string) => {
    if (!owner || !repo || selectedPrNumber == null) return;
    mergePr.mutate({ owner, repo, number: selectedPrNumber, method });
  };

  const handleClose = () => {
    if (!owner || !repo || selectedPrNumber == null) return;
    closePr.mutate({ owner, repo, number: selectedPrNumber });
  };

  const handleReopen = () => {
    if (!owner || !repo || selectedPrNumber == null) return;
    reopenPr.mutate({ owner, repo, number: selectedPrNumber });
  };

  const StateIcon = pr.state === "merged"
    ? GitMerge
    : pr.state === "closed"
      ? GitPullRequestClosed
      : GitPullRequest;

  const stateColor = pr.state === "merged"
    ? "text-purple-400"
    : pr.state === "closed"
      ? "text-red-400"
      : "text-green-400";

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
            #{pr.number}: {pr.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            {selectedRepoFullName}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pr.state === "open" && (
            <Button variant="outline" size="sm" onClick={handleClose}>
              Close
            </Button>
          )}
          {pr.state === "closed" && (
            <Button variant="outline" size="sm" onClick={handleReopen}>
              Reopen
            </Button>
          )}
          <MergeButton
            mergeable={pr.mergeable}
            state={pr.state}
            onMerge={handleMerge}
            isMerging={mergePr.isPending}
          />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b px-4 shrink-0">
        {(
          [
            { key: "conversation", label: "Conversation" },
            { key: "commits", label: `Commits (${pr.totalCommits})` },
            { key: "files", label: `Files Changed (${pr.changedFiles})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-3 py-2 text-xs font-medium transition-colors",
              activeTab === tab.key
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "conversation" && (
            <div className="p-4 space-y-4">
              {pr.body && <MarkdownBody content={pr.body} />}
              <Separator />
              <CommentThread events={pr.timeline} />
              {pr.reviews.filter((r) => r.body).map((review) => (
                <div key={review.id} className="rounded-md border border-border bg-background">
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                    {review.authorAvatarUrl && (
                      <img src={review.authorAvatarUrl} alt={review.authorLogin} className="h-5 w-5 rounded-full" />
                    )}
                    <span className="text-xs font-medium">{review.authorLogin}</span>
                    <span className={cn(
                      "text-[10px] rounded-full px-1.5 py-0.5 font-medium",
                      review.state === "APPROVED" && "bg-green-500/15 text-green-400",
                      review.state === "CHANGES_REQUESTED" && "bg-red-500/15 text-red-400",
                      review.state === "COMMENTED" && "bg-muted text-muted-foreground",
                    )}>
                      {review.state}
                    </span>
                    {review.submittedAt && <TimeAgo date={review.submittedAt} />}
                  </div>
                  <div className="px-3 py-2">
                    <MarkdownBody content={review.body} />
                  </div>
                </div>
              ))}
              <Separator />
              <ReviewForm onSubmit={handleSubmitReview} isSubmitting={submitReview.isPending} />
              <CommentEditor onSubmit={handleAddComment} isSubmitting={addComment.isPending} />
            </div>
          )}

          {activeTab === "commits" && (
            <div>
              {commits?.map((c) => (
                <div key={c.sha} className="flex items-center gap-3 px-4 py-2 border-b border-border/50">
                  <code className="text-xs text-muted-foreground font-mono">{c.sha.slice(0, 7)}</code>
                  <span className="text-sm flex-1 truncate">{c.messageHeadline}</span>
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={c.authorAvatarUrl} alt={c.authorLogin} />
                    <AvatarFallback className="text-[9px]">
                      {c.authorLogin.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <TimeAgo date={c.authoredDate} />
                </div>
              ))}
              {(!commits || commits.length === 0) && (
                <p className="py-8 text-center text-sm text-muted-foreground">No commits found.</p>
              )}
            </div>
          )}

          {activeTab === "files" && (
            <div className="flex flex-1 h-full">
              <div className="w-56 border-r overflow-y-auto">
                <DiffFileTree files={files ?? []} selectedFile={selectedFile} onSelectFile={setSelectedFile} />
              </div>
              <div className="flex-1 overflow-auto p-4">
                <DiffViewer files={files ?? []} selectedFile={selectedFile} />
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-64 border-l overflow-y-auto shrink-0 p-4 space-y-4">
          {/* Reviewers */}
          {pr.reviews.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Reviewers</h3>
              <div className="space-y-1.5">
                {pr.reviews.map((review) => (
                  <div key={review.id} className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={review.authorAvatarUrl} alt={review.authorLogin} />
                      <AvatarFallback className="text-[9px]">
                        {review.authorLogin.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs truncate">{review.authorLogin}</span>
                    <span
                      className={cn(
                        "text-[10px] ml-auto",
                        review.state === "APPROVED" && "text-green-400",
                        review.state === "CHANGES_REQUESTED" && "text-red-400",
                        review.state === "COMMENTED" && "text-muted-foreground",
                        review.state === "PENDING" && "text-yellow-400",
                      )}
                    >
                      {review.state}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Labels */}
          {pr.labels.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Labels</h3>
              <div className="flex flex-wrap gap-1">
                {pr.labels.map((label) => (
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

          {/* Linked Issues */}
          {pr.linkedIssues && pr.linkedIssues.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Linked Issues</h3>
              <div className="space-y-1">
                {pr.linkedIssues.map((issue) => (
                  <button
                    key={issue.number}
                    className="flex items-center gap-2 w-full text-left hover:bg-accent/50 rounded px-1.5 py-1 -mx-1.5 transition-colors"
                    onClick={() => navigateToIssue(selectedRepoFullName!, issue.number)}
                  >
                    {issue.state === "closed" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                    ) : (
                      <CircleDot className="h-3.5 w-3.5 text-green-400 shrink-0" />
                    )}
                    <span className="text-xs truncate">{issue.title}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">#{issue.number}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Branch info */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Branches</h3>
            <div className="flex items-center gap-1 text-xs">
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{pr.headRef}</code>
              <span className="text-muted-foreground">&rarr;</span>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{pr.baseRef}</code>
            </div>
          </div>

          {/* Status checks */}
          {pr.statusChecks.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Checks</h3>
              <StatusChecks checks={pr.statusChecks} />
            </div>
          )}

          {/* Diff stats */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Changes</h3>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <Plus className="h-3 w-3 text-green-400" />
                <span className="text-green-400">{pr.additions}</span>
              </div>
              <div className="flex items-center gap-1">
                <Minus className="h-3 w-3 text-red-400" />
                <span className="text-red-400">{pr.deletions}</span>
              </div>
              <span className="text-muted-foreground">{pr.changedFiles} files</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
