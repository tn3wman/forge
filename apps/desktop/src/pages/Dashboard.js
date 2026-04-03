"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dashboard = Dashboard;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var useDashboard_1 = require("@/queries/useDashboard");
var useWorkspaceTint_1 = require("@/hooks/useWorkspaceTint");
var usePullRequests_1 = require("@/queries/usePullRequests");
var useIssues_1 = require("@/queries/useIssues");
var workspaceStore_1 = require("@/stores/workspaceStore");
var avatar_1 = require("@/components/ui/avatar");
var TimeAgo_1 = require("@/components/common/TimeAgo");
function StatPill(_a) {
    var icon = _a.icon, label = _a.label, value = _a.value;
    return (<div className="flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium shrink-0">
      {icon}
      <span className="tabular-nums">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>);
}
function ActivityIcon(_a) {
    var item = _a.item;
    if (item.kind === "issue") {
        return item.data.state === "closed"
            ? <lucide_react_1.CheckCircle2 className="h-4 w-4 text-purple-400"/>
            : <lucide_react_1.CircleDot className="h-4 w-4 text-green-400"/>;
    }
    var pr = item.data;
    if (pr.draft)
        return <lucide_react_1.GitPullRequestDraft className="h-4 w-4 text-muted-foreground"/>;
    if (pr.state === "merged")
        return <lucide_react_1.GitMerge className="h-4 w-4 text-purple-400"/>;
    if (pr.state === "closed")
        return <lucide_react_1.GitPullRequestClosed className="h-4 w-4 text-red-400"/>;
    return <lucide_react_1.GitPullRequest className="h-4 w-4 text-green-400"/>;
}
function ActivityRow(_a) {
    var item = _a.item, onClick = _a.onClick;
    var number = item.kind === "pr" ? item.data.number : item.data.number;
    var title = item.kind === "pr" ? item.data.title : item.data.title;
    var authorLogin = item.kind === "pr" ? item.data.authorLogin : item.data.authorLogin;
    var authorAvatarUrl = item.kind === "pr" ? item.data.authorAvatarUrl : item.data.authorAvatarUrl;
    var labels = item.kind === "issue" ? item.data.labels : item.data.labels;
    return (<div className="flex items-center h-10 gap-2 px-3 hover:bg-accent/50 transition-colors border-b border-border/50 cursor-pointer" onClick={onClick}>
      {/* Icon */}
      <div className="w-5 shrink-0 flex items-center justify-center">
        <ActivityIcon item={item}/>
      </div>

      {/* Number */}
      <div className="w-[50px] shrink-0">
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          #{number}
        </span>
      </div>

      {/* Title (flexible) */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">{title}</span>
      </div>

      {/* Labels */}
      <div className="w-[160px] shrink-0 flex items-center gap-1">
        {labels.slice(0, 3).map(function (label) { return (<span key={label} className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground whitespace-nowrap">
            {label}
          </span>); })}
        {labels.length > 3 && (<span className="text-[10px] text-muted-foreground shrink-0">
            +{labels.length - 3}
          </span>)}
      </div>

      {/* Diff stats (PRs only) */}
      <div className="w-[100px] shrink-0 flex items-center gap-1 text-xs tabular-nums">
        {item.kind === "pr" && (<>
            <lucide_react_1.Plus className="h-3 w-3 text-green-400"/>
            <span className="text-green-400">{item.data.additions}</span>
            <lucide_react_1.Minus className="h-3 w-3 text-red-400 ml-1"/>
            <span className="text-red-400">{item.data.deletions}</span>
          </>)}
      </div>

      {/* Author */}
      <div className="w-[100px] shrink-0 flex items-center gap-1.5 justify-end overflow-hidden">
        <span className="text-xs text-muted-foreground truncate">{authorLogin}</span>
        <avatar_1.Avatar className="h-5 w-5 shrink-0">
          <avatar_1.AvatarImage src={authorAvatarUrl} alt={authorLogin}/>
          <avatar_1.AvatarFallback className="text-[9px]">
            {authorLogin.slice(0, 2).toUpperCase()}
          </avatar_1.AvatarFallback>
        </avatar_1.Avatar>
      </div>

      {/* Updated */}
      <div className="w-[55px] shrink-0 text-right">
        <TimeAgo_1.TimeAgo date={item.updatedAt}/>
      </div>
    </div>);
}
function Dashboard() {
    var _a, _b, _c, _d;
    var _e = (0, useDashboard_1.useDashboardStats)(), stats = _e.data, statsLoading = _e.isLoading;
    var tintStyle = (0, useWorkspaceTint_1.useWorkspaceTint)();
    var _f = (0, usePullRequests_1.usePullRequests)().data, prs = _f === void 0 ? [] : _f;
    var _g = (0, useIssues_1.useIssues)().data, issues = _g === void 0 ? [] : _g;
    var _h = (0, workspaceStore_1.useWorkspaceStore)(), navigateToPr = _h.navigateToPr, navigateToIssue = _h.navigateToIssue;
    var recentActivity = (0, react_1.useMemo)(function () {
        var items = __spreadArray(__spreadArray([], prs.slice(0, 15).map(function (pr) { return ({ kind: "pr", data: pr, updatedAt: pr.updatedAt }); }), true), issues.slice(0, 15).map(function (issue) { return ({ kind: "issue", data: issue, updatedAt: issue.updatedAt }); }), true);
        items.sort(function (a, b) { return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(); });
        return items.slice(0, 25);
    }, [prs, issues]);
    if (statsLoading) {
        return (<div className="flex items-center justify-center h-full text-muted-foreground">
        <lucide_react_1.Loader2 className="h-5 w-5 animate-spin mr-2"/>
        <span className="text-sm">Loading dashboard...</span>
      </div>);
    }
    return (<div className="flex flex-col h-full">
      {/* Title bar with stats */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 h-8" data-tauri-drag-region style={tintStyle}>
        <StatPill icon={<lucide_react_1.CircleDot className="h-3 w-3 text-green-400"/>} label="Issues" value={(_a = stats === null || stats === void 0 ? void 0 : stats.totalOpenIssues) !== null && _a !== void 0 ? _a : 0}/>
        <StatPill icon={<lucide_react_1.GitPullRequest className="h-3 w-3 text-green-400"/>} label="PRs" value={(_b = stats === null || stats === void 0 ? void 0 : stats.totalOpenPrs) !== null && _b !== void 0 ? _b : 0}/>
        <StatPill icon={<lucide_react_1.AlertCircle className="h-3 w-3 text-yellow-400"/>} label="Review" value={(_c = stats === null || stats === void 0 ? void 0 : stats.prsNeedingReview) !== null && _c !== void 0 ? _c : 0}/>
        <StatPill icon={<lucide_react_1.GitMerge className="h-3 w-3 text-purple-400"/>} label="Merged" value={(_d = stats === null || stats === void 0 ? void 0 : stats.recentlyMerged) !== null && _d !== void 0 ? _d : 0}/>
      </div>

      <div className="flex-1 overflow-y-auto">
        {recentActivity.length === 0 && (<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <span className="text-sm">No recent activity</span>
            <span className="text-xs text-muted-foreground/70 mt-1">
              Add repositories to your workspace to see activity
            </span>
          </div>)}

        {recentActivity.map(function (item) { return (<ActivityRow key={"".concat(item.kind, "-").concat(item.kind === "pr" ? item.data.id : item.data.id)} item={item} onClick={function () {
                if (item.kind === "pr" && item.data.repoFullName) {
                    navigateToPr(item.data.repoFullName, item.data.number);
                }
                else if (item.kind === "issue" && item.data.repoFullName) {
                    navigateToIssue(item.data.repoFullName, item.data.number);
                }
            }}/>); })}
      </div>
    </div>);
}
