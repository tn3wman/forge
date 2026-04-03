"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssueListItem = IssueListItem;
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var avatar_1 = require("@/components/ui/avatar");
var TimeAgo_1 = require("@/components/common/TimeAgo");
var workspaceStore_1 = require("@/stores/workspaceStore");
function IssueStatusIcon(_a) {
    var state = _a.state;
    if (state === "closed") {
        return <lucide_react_1.CheckCircle2 className="h-4 w-4 text-purple-400"/>;
    }
    return <lucide_react_1.CircleDot className="h-4 w-4 text-green-400"/>;
}
function LabelPill(_a) {
    var label = _a.label;
    return (<span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground whitespace-nowrap">
      {label}
    </span>);
}
function IssueListItem(_a) {
    var issue = _a.issue, linkedPrs = _a.linkedPrs, onClick = _a.onClick, onStartWork = _a.onStartWork;
    var navigateToPr = (0, workspaceStore_1.useWorkspaceStore)().navigateToPr;
    return (<div className="flex items-center h-10 gap-2 px-3 hover:bg-accent/50 transition-colors border-b border-border/50 cursor-pointer" onClick={onClick}>
      {/* Left group: icon + number + title (flexible) */}
      <div className="w-5 shrink-0 flex items-center justify-center">
        <IssueStatusIcon state={issue.state}/>
      </div>

      <div className="w-[50px] shrink-0">
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          #{issue.number}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">{issue.title}</span>
      </div>

      {/* Right group: labels and PRs left-aligned in fixed columns */}
      <div className="w-[160px] shrink-0 flex items-center gap-1">
        {issue.labels.slice(0, 3).map(function (label) { return (<LabelPill key={label} label={label}/>); })}
        {issue.labels.length > 3 && (<span className="text-[10px] text-muted-foreground shrink-0">
            +{issue.labels.length - 3}
          </span>)}
      </div>

      <div className="w-[120px] shrink-0 flex items-center gap-1">
        {linkedPrs && linkedPrs.length > 0 && (<>
            {linkedPrs.slice(0, 2).map(function (pr) { return (<button key={pr.prNumber} className={(0, utils_1.cn)("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-mono transition-colors", pr.prState === "merged"
                    ? "border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                    : pr.prState === "closed"
                        ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        : "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20")} onClick={function (e) {
                    e.stopPropagation();
                    navigateToPr(pr.repoFullName, pr.prNumber);
                }}>
                <lucide_react_1.GitPullRequest className="h-3 w-3"/>
                #{pr.prNumber}
              </button>); })}
            {linkedPrs.length > 2 && (<span className="text-[10px] text-muted-foreground shrink-0">
                +{linkedPrs.length - 2}
              </span>)}
          </>)}
      </div>

      <div className="w-[100px] shrink-0 flex items-center gap-1.5 justify-end overflow-hidden">
        <span className="text-xs text-muted-foreground truncate">{issue.authorLogin}</span>
        <avatar_1.Avatar className="h-5 w-5 shrink-0">
          <avatar_1.AvatarImage src={issue.authorAvatarUrl} alt={issue.authorLogin}/>
          <avatar_1.AvatarFallback className="text-[9px]">
            {issue.authorLogin.slice(0, 2).toUpperCase()}
          </avatar_1.AvatarFallback>
        </avatar_1.Avatar>
      </div>

      <div className="w-[55px] shrink-0 text-right">
        <TimeAgo_1.TimeAgo date={issue.updatedAt}/>
      </div>

      <div className="w-8 shrink-0 flex items-center justify-center">
        {issue.state === "open" && onStartWork && (<button className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" onClick={function (e) {
                e.stopPropagation();
                onStartWork();
            }} title="Start work on this issue">
            <lucide_react_1.Rocket className="h-3.5 w-3.5"/>
          </button>)}
      </div>
    </div>);
}
