"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrListItem = PrListItem;
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var workspaceStore_1 = require("@/stores/workspaceStore");
var avatar_1 = require("@/components/ui/avatar");
var TimeAgo_1 = require("@/components/common/TimeAgo");
function PrStatusIcon(_a) {
    var pr = _a.pr;
    if (pr.draft) {
        return <lucide_react_1.GitPullRequestDraft className="h-4 w-4 text-muted-foreground"/>;
    }
    switch (pr.state) {
        case "merged":
            return <lucide_react_1.GitMerge className="h-4 w-4 text-purple-400"/>;
        case "closed":
            return <lucide_react_1.GitPullRequestClosed className="h-4 w-4 text-red-400"/>;
        case "open":
        default:
            return <lucide_react_1.GitPullRequest className="h-4 w-4 text-green-400"/>;
    }
}
function ReviewBadge(_a) {
    var decision = _a.decision;
    if (!decision)
        return null;
    var config = {
        APPROVED: {
            label: "Approved",
            className: "bg-green-500/15 text-green-400",
            icon: <lucide_react_1.CheckCircle2 className="h-3 w-3"/>,
        },
        CHANGES_REQUESTED: {
            label: "Changes",
            className: "bg-red-500/15 text-red-400",
            icon: <lucide_react_1.XCircle className="h-3 w-3"/>,
        },
        REVIEW_REQUIRED: {
            label: "Review",
            className: "bg-yellow-500/15 text-yellow-400",
            icon: <lucide_react_1.AlertCircle className="h-3 w-3"/>,
        },
    };
    var c = config[decision];
    if (!c)
        return null;
    return (<span className={(0, utils_1.cn)("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap", c.className)}>
      {c.icon}
      {c.label}
    </span>);
}
function PrListItem(_a) {
    var pr = _a.pr, onClick = _a.onClick;
    var navigateToIssue = (0, workspaceStore_1.useWorkspaceStore)().navigateToIssue;
    return (<div className="flex items-center h-10 gap-2 px-3 hover:bg-accent/50 transition-colors border-b border-border/50 cursor-pointer" onClick={onClick}>
      {/* Status icon */}
      <div className="w-5 shrink-0 flex items-center justify-center">
        <PrStatusIcon pr={pr}/>
      </div>

      {/* PR number */}
      <div className="w-[50px] shrink-0">
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          #{pr.number}
        </span>
      </div>

      {/* Title (flexible) */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">{pr.title}</span>
      </div>

      {/* Review status */}
      <div className="shrink-0">
        <ReviewBadge decision={pr.reviewDecision}/>
      </div>

      {/* Diff stats */}
      <div className="w-[100px] shrink-0 flex items-center gap-1 text-xs tabular-nums">
        <lucide_react_1.Plus className="h-3 w-3 text-green-400"/>
        <span className="text-green-400">{pr.additions}</span>
        <lucide_react_1.Minus className="h-3 w-3 text-red-400 ml-1"/>
        <span className="text-red-400">{pr.deletions}</span>
      </div>

      {/* Linked issues */}
      <div className="w-[120px] shrink-0 flex items-center gap-1">
        {pr.linkedIssues && pr.linkedIssues.length > 0 && (<>
            {pr.linkedIssues.slice(0, 2).map(function (issue) { return (<button key={issue.number} className={(0, utils_1.cn)("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-mono transition-colors", issue.state === "closed"
                    ? "border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                    : "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20")} onClick={function (e) {
                    e.stopPropagation();
                    if (pr.repoFullName)
                        navigateToIssue(pr.repoFullName, issue.number);
                }}>
                <lucide_react_1.Link2 className="h-3 w-3"/>
                #{issue.number}
              </button>); })}
            {pr.linkedIssues.length > 2 && (<span className="text-[10px] text-muted-foreground shrink-0">
                +{pr.linkedIssues.length - 2}
              </span>)}
          </>)}
      </div>

      {/* Author */}
      <div className="w-[100px] shrink-0 flex items-center gap-1.5 justify-end overflow-hidden">
        <span className="text-xs text-muted-foreground truncate">{pr.authorLogin}</span>
        <avatar_1.Avatar className="h-5 w-5 shrink-0">
          <avatar_1.AvatarImage src={pr.authorAvatarUrl} alt={pr.authorLogin}/>
          <avatar_1.AvatarFallback className="text-[9px]">
            {pr.authorLogin.slice(0, 2).toUpperCase()}
          </avatar_1.AvatarFallback>
        </avatar_1.Avatar>
      </div>

      {/* Updated */}
      <div className="w-[55px] shrink-0 text-right">
        <TimeAgo_1.TimeAgo date={pr.updatedAt}/>
      </div>
    </div>);
}
