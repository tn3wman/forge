"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrDetail = PrDetail;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var workspaceStore_1 = require("@/stores/workspaceStore");
var usePrDetail_1 = require("@/queries/usePrDetail");
var useMutations_1 = require("@/queries/useMutations");
var MarkdownBody_1 = require("@/components/common/MarkdownBody");
var CommentThread_1 = require("@/components/comment/CommentThread");
var CommentEditor_1 = require("@/components/comment/CommentEditor");
var DiffViewer_1 = require("@/components/diff/DiffViewer");
var DiffFileTree_1 = require("@/components/diff/DiffFileTree");
var ReviewForm_1 = require("@/components/github/ReviewForm");
var MergeButton_1 = require("@/components/github/MergeButton");
var StatusChecks_1 = require("@/components/github/StatusChecks");
var button_1 = require("@/components/ui/button");
var separator_1 = require("@/components/ui/separator");
var avatar_1 = require("@/components/ui/avatar");
var TimeAgo_1 = require("@/components/common/TimeAgo");
function PrDetail() {
    var _a;
    var _b = (0, workspaceStore_1.useWorkspaceStore)(), selectedRepoFullName = _b.selectedRepoFullName, selectedPrNumber = _b.selectedPrNumber, goBack = _b.goBack, navigateToIssue = _b.navigateToIssue;
    var _c = (0, react_1.useState)("conversation"), activeTab = _c[0], setActiveTab = _c[1];
    var _d = (0, react_1.useState)(), selectedFile = _d[0], setSelectedFile = _d[1];
    var _e = (_a = selectedRepoFullName === null || selectedRepoFullName === void 0 ? void 0 : selectedRepoFullName.split("/")) !== null && _a !== void 0 ? _a : [null, null], owner = _e[0], repo = _e[1];
    var _f = (0, usePrDetail_1.usePrDetail)(owner, repo, selectedPrNumber), pr = _f.data, isLoading = _f.isLoading, error = _f.error;
    var commits = (0, usePrDetail_1.usePrCommits)(owner, repo, selectedPrNumber).data;
    var files = (0, usePrDetail_1.usePrFiles)(owner, repo, selectedPrNumber).data;
    var addComment = (0, useMutations_1.useAddComment)();
    var submitReview = (0, useMutations_1.useSubmitReview)();
    var mergePr = (0, useMutations_1.useMergePr)();
    var closePr = (0, useMutations_1.useClosePr)();
    var reopenPr = (0, useMutations_1.useReopenPr)();
    if (isLoading) {
        return (<div className="flex items-center justify-center h-full text-muted-foreground">
        <lucide_react_1.Loader2 className="h-5 w-5 animate-spin mr-2"/>
        <span className="text-sm">Loading pull request...</span>
      </div>);
    }
    if (error || !pr) {
        return (<div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p className="text-sm text-destructive">Failed to load pull request</p>
        <button_1.Button variant="ghost" size="sm" className="mt-2" onClick={goBack}>
          <lucide_react_1.ArrowLeft className="h-4 w-4 mr-1"/>
          Go back
        </button_1.Button>
      </div>);
    }
    var handleAddComment = function (body) {
        if (!owner || !repo || selectedPrNumber == null)
            return;
        addComment.mutate({ owner: owner, repo: repo, number: selectedPrNumber, body: body });
    };
    var handleSubmitReview = function (event, body) {
        if (!owner || !repo || selectedPrNumber == null)
            return;
        submitReview.mutate({ owner: owner, repo: repo, number: selectedPrNumber, event: event, body: body });
    };
    var handleMerge = function (method) {
        if (!owner || !repo || selectedPrNumber == null)
            return;
        mergePr.mutate({ owner: owner, repo: repo, number: selectedPrNumber, method: method });
    };
    var handleClose = function () {
        if (!owner || !repo || selectedPrNumber == null)
            return;
        closePr.mutate({ owner: owner, repo: repo, number: selectedPrNumber });
    };
    var handleReopen = function () {
        if (!owner || !repo || selectedPrNumber == null)
            return;
        reopenPr.mutate({ owner: owner, repo: repo, number: selectedPrNumber });
    };
    var StateIcon = pr.state === "merged"
        ? lucide_react_1.GitMerge
        : pr.state === "closed"
            ? lucide_react_1.GitPullRequestClosed
            : lucide_react_1.GitPullRequest;
    var stateColor = pr.state === "merged"
        ? "text-purple-400"
        : pr.state === "closed"
            ? "text-red-400"
            : "text-green-400";
    return (<div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
        <button_1.Button variant="ghost" size="sm" onClick={goBack} className="shrink-0">
          <lucide_react_1.ArrowLeft className="h-4 w-4"/>
        </button_1.Button>
        <StateIcon className={(0, utils_1.cn)("h-5 w-5 shrink-0", stateColor)}/>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate">
            #{pr.number}: {pr.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            {selectedRepoFullName}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pr.state === "open" && (<button_1.Button variant="outline" size="sm" onClick={handleClose}>
              Close
            </button_1.Button>)}
          {pr.state === "closed" && (<button_1.Button variant="outline" size="sm" onClick={handleReopen}>
              Reopen
            </button_1.Button>)}
          <MergeButton_1.MergeButton mergeable={pr.mergeable} state={pr.state} onMerge={handleMerge} isMerging={mergePr.isPending}/>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b px-4 shrink-0">
        {[
            { key: "conversation", label: "Conversation" },
            { key: "commits", label: "Commits (".concat(pr.totalCommits, ")") },
            { key: "files", label: "Files Changed (".concat(pr.changedFiles, ")") },
        ].map(function (tab) { return (<button key={tab.key} type="button" onClick={function () { return setActiveTab(tab.key); }} className={(0, utils_1.cn)("px-3 py-2 text-xs font-medium transition-colors", activeTab === tab.key
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground")}>
            {tab.label}
          </button>); })}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "conversation" && (<div className="p-4 space-y-4">
              {pr.body && <MarkdownBody_1.MarkdownBody content={pr.body}/>}
              <separator_1.Separator />
              <CommentThread_1.CommentThread events={pr.timeline}/>
              {pr.reviews.filter(function (r) { return r.body; }).map(function (review) { return (<div key={review.id} className="rounded-md border border-border bg-background">
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                    {review.authorAvatarUrl && (<img src={review.authorAvatarUrl} alt={review.authorLogin} className="h-5 w-5 rounded-full"/>)}
                    <span className="text-xs font-medium">{review.authorLogin}</span>
                    <span className={(0, utils_1.cn)("text-[10px] rounded-full px-1.5 py-0.5 font-medium", review.state === "APPROVED" && "bg-green-500/15 text-green-400", review.state === "CHANGES_REQUESTED" && "bg-red-500/15 text-red-400", review.state === "COMMENTED" && "bg-muted text-muted-foreground")}>
                      {review.state}
                    </span>
                    {review.submittedAt && <TimeAgo_1.TimeAgo date={review.submittedAt}/>}
                  </div>
                  <div className="px-3 py-2">
                    <MarkdownBody_1.MarkdownBody content={review.body}/>
                  </div>
                </div>); })}
              <separator_1.Separator />
              <ReviewForm_1.ReviewForm onSubmit={handleSubmitReview} isSubmitting={submitReview.isPending}/>
              <CommentEditor_1.CommentEditor onSubmit={handleAddComment} isSubmitting={addComment.isPending}/>
            </div>)}

          {activeTab === "commits" && (<div>
              {commits === null || commits === void 0 ? void 0 : commits.map(function (c) { return (<div key={c.sha} className="flex items-center gap-3 px-4 py-2 border-b border-border/50">
                  <code className="text-xs text-muted-foreground font-mono">{c.sha.slice(0, 7)}</code>
                  <span className="text-sm flex-1 truncate">{c.messageHeadline}</span>
                  <avatar_1.Avatar className="h-5 w-5">
                    <avatar_1.AvatarImage src={c.authorAvatarUrl} alt={c.authorLogin}/>
                    <avatar_1.AvatarFallback className="text-[9px]">
                      {c.authorLogin.slice(0, 2).toUpperCase()}
                    </avatar_1.AvatarFallback>
                  </avatar_1.Avatar>
                  <TimeAgo_1.TimeAgo date={c.authoredDate}/>
                </div>); })}
              {(!commits || commits.length === 0) && (<p className="py-8 text-center text-sm text-muted-foreground">No commits found.</p>)}
            </div>)}

          {activeTab === "files" && (<div className="flex flex-1 h-full">
              <div className="w-56 border-r overflow-y-auto">
                <DiffFileTree_1.DiffFileTree files={files !== null && files !== void 0 ? files : []} selectedFile={selectedFile} onSelectFile={setSelectedFile}/>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <DiffViewer_1.DiffViewer files={files !== null && files !== void 0 ? files : []} selectedFile={selectedFile}/>
              </div>
            </div>)}
        </div>

        {/* Right sidebar */}
        <div className="w-64 border-l overflow-y-auto shrink-0 p-4 space-y-4">
          {/* Reviewers */}
          {pr.reviews.length > 0 && (<div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Reviewers</h3>
              <div className="space-y-1.5">
                {pr.reviews.map(function (review) { return (<div key={review.id} className="flex items-center gap-2">
                    <avatar_1.Avatar className="h-5 w-5">
                      <avatar_1.AvatarImage src={review.authorAvatarUrl} alt={review.authorLogin}/>
                      <avatar_1.AvatarFallback className="text-[9px]">
                        {review.authorLogin.slice(0, 2).toUpperCase()}
                      </avatar_1.AvatarFallback>
                    </avatar_1.Avatar>
                    <span className="text-xs truncate">{review.authorLogin}</span>
                    <span className={(0, utils_1.cn)("text-[10px] ml-auto", review.state === "APPROVED" && "text-green-400", review.state === "CHANGES_REQUESTED" && "text-red-400", review.state === "COMMENTED" && "text-muted-foreground", review.state === "PENDING" && "text-yellow-400")}>
                      {review.state}
                    </span>
                  </div>); })}
              </div>
            </div>)}

          {/* Labels */}
          {pr.labels.length > 0 && (<div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Labels</h3>
              <div className="flex flex-wrap gap-1">
                {pr.labels.map(function (label) { return (<span key={label} className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                    {label}
                  </span>); })}
              </div>
            </div>)}

          {/* Linked Issues */}
          {pr.linkedIssues && pr.linkedIssues.length > 0 && (<div className="mb-4">
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Linked Issues</h3>
              <div className="space-y-1">
                {pr.linkedIssues.map(function (issue) { return (<button key={issue.number} className="flex items-center gap-2 w-full text-left hover:bg-accent/50 rounded px-1.5 py-1 -mx-1.5 transition-colors" onClick={function () { return navigateToIssue(selectedRepoFullName, issue.number); }}>
                    {issue.state === "closed" ? (<lucide_react_1.CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0"/>) : (<lucide_react_1.CircleDot className="h-3.5 w-3.5 text-green-400 shrink-0"/>)}
                    <span className="text-xs truncate">{issue.title}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">#{issue.number}</span>
                  </button>); })}
              </div>
            </div>)}

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
          {pr.statusChecks.length > 0 && (<div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Checks</h3>
              <StatusChecks_1.StatusChecks checks={pr.statusChecks}/>
            </div>)}

          {/* Diff stats */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Changes</h3>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <lucide_react_1.Plus className="h-3 w-3 text-green-400"/>
                <span className="text-green-400">{pr.additions}</span>
              </div>
              <div className="flex items-center gap-1">
                <lucide_react_1.Minus className="h-3 w-3 text-red-400"/>
                <span className="text-red-400">{pr.deletions}</span>
              </div>
              <span className="text-muted-foreground">{pr.changedFiles} files</span>
            </div>
          </div>
        </div>
      </div>
    </div>);
}
