"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssueDetail = IssueDetail;
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var workspaceStore_1 = require("@/stores/workspaceStore");
var useIssueDetail_1 = require("@/queries/useIssueDetail");
var useMutations_1 = require("@/queries/useMutations");
var MarkdownBody_1 = require("@/components/common/MarkdownBody");
var CommentThread_1 = require("@/components/comment/CommentThread");
var CommentEditor_1 = require("@/components/comment/CommentEditor");
var button_1 = require("@/components/ui/button");
var separator_1 = require("@/components/ui/separator");
var TimeAgo_1 = require("@/components/common/TimeAgo");
function IssueDetail() {
    var _a;
    var _b = (0, workspaceStore_1.useWorkspaceStore)(), selectedRepoFullName = _b.selectedRepoFullName, selectedIssueNumber = _b.selectedIssueNumber, goBack = _b.goBack, navigateToPr = _b.navigateToPr;
    var _c = (_a = selectedRepoFullName === null || selectedRepoFullName === void 0 ? void 0 : selectedRepoFullName.split("/")) !== null && _a !== void 0 ? _a : [null, null], owner = _c[0], repo = _c[1];
    var _d = (0, useIssueDetail_1.useIssueDetail)(owner, repo, selectedIssueNumber), issue = _d.data, isLoading = _d.isLoading, error = _d.error;
    var addComment = (0, useMutations_1.useAddComment)();
    if (isLoading) {
        return (<div className="flex items-center justify-center h-full text-muted-foreground">
        <lucide_react_1.Loader2 className="h-5 w-5 animate-spin mr-2"/>
        <span className="text-sm">Loading issue...</span>
      </div>);
    }
    if (error || !issue) {
        return (<div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p className="text-sm text-destructive">Failed to load issue</p>
        <button_1.Button variant="ghost" size="sm" className="mt-2" onClick={goBack}>
          <lucide_react_1.ArrowLeft className="h-4 w-4 mr-1"/>
          Go back
        </button_1.Button>
      </div>);
    }
    var handleAddComment = function (body) {
        if (!owner || !repo || selectedIssueNumber == null)
            return;
        addComment.mutate({ owner: owner, repo: repo, number: selectedIssueNumber, body: body });
    };
    var StateIcon = issue.state === "closed" ? lucide_react_1.CheckCircle2 : lucide_react_1.CircleDot;
    var stateColor = issue.state === "closed" ? "text-purple-400" : "text-green-400";
    return (<div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
        <button_1.Button variant="ghost" size="sm" onClick={goBack} className="shrink-0">
          <lucide_react_1.ArrowLeft className="h-4 w-4"/>
        </button_1.Button>
        <StateIcon className={(0, utils_1.cn)("h-5 w-5 shrink-0", stateColor)}/>
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
          {issue.body && <MarkdownBody_1.MarkdownBody content={issue.body}/>}
          <separator_1.Separator />
          <CommentThread_1.CommentThread events={issue.timeline}/>
          <CommentEditor_1.CommentEditor onSubmit={handleAddComment} isSubmitting={addComment.isPending}/>
        </div>

        {/* Right sidebar */}
        <div className="w-64 border-l overflow-y-auto shrink-0 p-4 space-y-4">
          {/* Assignees */}
          {issue.assignees.length > 0 && (<div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Assignees</h3>
              <div className="space-y-1">
                {issue.assignees.map(function (assignee) { return (<div key={assignee} className="text-xs text-foreground">{assignee}</div>); })}
              </div>
            </div>)}

          {/* Labels */}
          {issue.labels.length > 0 && (<div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Labels</h3>
              <div className="flex flex-wrap gap-1">
                {issue.labels.map(function (label) { return (<span key={label} className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                    {label}
                  </span>); })}
              </div>
            </div>)}

          {/* Linked Pull Requests */}
          {issue.linkedPullRequests && issue.linkedPullRequests.length > 0 && (<div className="mb-4">
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Linked Pull Requests</h3>
              <div className="space-y-1">
                {issue.linkedPullRequests.map(function (pr) { return (<button key={"".concat(pr.repoFullName, "-").concat(pr.number)} className="flex items-center gap-2 w-full text-left hover:bg-accent/50 rounded px-1.5 py-1 -mx-1.5 transition-colors" onClick={function () { return navigateToPr(pr.repoFullName, pr.number); }}>
                    <lucide_react_1.GitPullRequest className={(0, utils_1.cn)("h-3.5 w-3.5 shrink-0", pr.state === "merged" ? "text-purple-400" : pr.state === "closed" ? "text-red-400" : "text-green-400")}/>
                    <span className="text-xs truncate">{pr.title}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">#{pr.number}</span>
                  </button>); })}
              </div>
            </div>)}

          {/* Timestamps */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Created</h3>
            <TimeAgo_1.TimeAgo date={issue.createdAt}/>
          </div>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Updated</h3>
            <TimeAgo_1.TimeAgo date={issue.updatedAt}/>
          </div>
        </div>
      </div>
    </div>);
}
