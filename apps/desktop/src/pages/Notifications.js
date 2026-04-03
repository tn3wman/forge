"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notifications = Notifications;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var useNotifications_1 = require("@/queries/useNotifications");
var workspaceStore_1 = require("@/stores/workspaceStore");
var useRepositories_1 = require("@/queries/useRepositories");
var useWorkspaceTint_1 = require("@/hooks/useWorkspaceTint");
var TimeAgo_1 = require("@/components/common/TimeAgo");
var utils_1 = require("@/lib/utils");
var REASON_LABELS = {
    assign: "Assigned",
    author: "Author",
    comment: "Comment",
    mention: "Mentioned",
    review_requested: "Review",
    state_change: "Changed",
    subscribed: "Subscribed",
    team_mention: "Team",
};
var NOTIF_FILTERS = [
    { value: "unread", label: "Unread" },
    { value: "all", label: "All" },
];
function subjectIcon(type) {
    switch (type) {
        case "PullRequest":
            return lucide_react_1.GitPullRequest;
        case "Issue":
            return lucide_react_1.CircleDot;
        case "Release":
            return lucide_react_1.Tag;
        case "Commit":
            return lucide_react_1.GitCommitHorizontal;
        case "Discussion":
            return lucide_react_1.MessageSquare;
        default:
            return lucide_react_1.Bell;
    }
}
function extractNumber(url) {
    if (!url)
        return null;
    var match = url.match(/\/(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
}
function Notifications() {
    var _a = (0, react_1.useState)("unread"), activeFilter = _a[0], setActiveFilter = _a[1];
    var showAll = activeFilter === "all";
    var _b = (0, useNotifications_1.useNotifications)(showAll), allNotifications = _b.data, isLoading = _b.isLoading;
    var markRead = (0, useNotifications_1.useMarkNotificationRead)();
    var markAllRead = (0, useNotifications_1.useMarkAllRead)();
    var _c = (0, workspaceStore_1.useWorkspaceStore)(), navigateToPr = _c.navigateToPr, navigateToIssue = _c.navigateToIssue, activeWorkspaceId = _c.activeWorkspaceId;
    var repos = (0, useRepositories_1.useRepositories)(activeWorkspaceId).data;
    var tintStyle = (0, useWorkspaceTint_1.useWorkspaceTint)();
    var workspaceRepoNames = (0, react_1.useMemo)(function () { var _a; return new Set((_a = repos === null || repos === void 0 ? void 0 : repos.map(function (r) { return r.fullName.toLowerCase(); })) !== null && _a !== void 0 ? _a : []); }, [repos]);
    var notifications = (0, react_1.useMemo)(function () {
        if (!allNotifications)
            return undefined;
        if (workspaceRepoNames.size === 0)
            return allNotifications;
        return allNotifications.filter(function (n) { return workspaceRepoNames.has(n.repoFullName.toLowerCase()); });
    }, [allNotifications, workspaceRepoNames]);
    var filterCounts = (0, react_1.useMemo)(function () {
        var _a, _b;
        return {
            unread: (_a = notifications === null || notifications === void 0 ? void 0 : notifications.filter(function (n) { return n.unread; }).length) !== null && _a !== void 0 ? _a : 0,
            all: (_b = notifications === null || notifications === void 0 ? void 0 : notifications.length) !== null && _b !== void 0 ? _b : 0,
        };
    }, [notifications]);
    function handleClick(n) {
        var number = extractNumber(n.subjectUrl);
        if (number == null)
            return;
        if (n.subjectType === "PullRequest") {
            navigateToPr(n.repoFullName, number);
        }
        else if (n.subjectType === "Issue") {
            navigateToIssue(n.repoFullName, number);
        }
    }
    return (<div className="flex h-full flex-col">
      {/* Title bar with filters */}
      <div className="relative flex shrink-0 items-center gap-2 border-b border-border px-4 h-8" data-tauri-drag-region style={tintStyle}>
        {NOTIF_FILTERS.map(function (f) { return (<button key={f.value} onClick={function () { return setActiveFilter(f.value); }} className={(0, utils_1.cn)("rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors shrink-0", activeFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-accent-foreground hover:bg-accent/80")}>
            {f.label}
            <span className="ml-1 opacity-70">{filterCounts[f.value]}</span>
          </button>); })}

        <div className="flex-1" data-tauri-drag-region/>

        <button onClick={function () { return markAllRead.mutate(); }} disabled={markAllRead.isPending} className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground hover:bg-accent/80 transition-colors shrink-0">
          <lucide_react_1.CheckCheck className="h-3 w-3"/>
          Mark all read
        </button>
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (<div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Loading notifications...</p>
          </div>)}

        {!isLoading && (!notifications || notifications.length === 0) && (<div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <lucide_react_1.Bell className="mb-3 h-8 w-8 opacity-30"/>
            <p className="text-sm">No notifications</p>
          </div>)}

        {notifications === null || notifications === void 0 ? void 0 : notifications.map(function (n) {
            var _a;
            var Icon = subjectIcon(n.subjectType);
            return (<div key={n.id} className="flex items-center h-10 gap-2 px-3 hover:bg-accent/50 transition-colors border-b border-border/50 cursor-pointer" onClick={function () { return handleClick(n); }}>
              {/* Icon + number column — matches Issues/PRs width */}
              <div className="w-5 shrink-0 flex items-center justify-center">
                <Icon className={(0, utils_1.cn)("h-4 w-4", n.unread ? "text-green-400" : "text-muted-foreground")}/>
              </div>

              <div className="w-[50px] shrink-0"/>

              {/* Title (flexible) */}
              <div className="flex-1 min-w-0">
                <span className={(0, utils_1.cn)("text-sm truncate block", n.unread && "font-semibold")}>
                  {n.subjectTitle}
                </span>
              </div>

              {/* Repo */}
              <div className="w-[160px] shrink-0">
                <span className="text-xs text-muted-foreground truncate block">
                  {n.repoFullName}
                </span>
              </div>

              {/* Reason */}
              <div className="w-[80px] shrink-0">
                <span className="text-xs text-muted-foreground">
                  {(_a = REASON_LABELS[n.reason]) !== null && _a !== void 0 ? _a : n.reason}
                </span>
              </div>

              {/* Time */}
              <div className="w-[55px] shrink-0 text-right">
                <TimeAgo_1.TimeAgo date={n.updatedAt}/>
              </div>

              {/* Mark read */}
              <div className="w-8 shrink-0 flex items-center justify-center">
                {n.unread && (<button onClick={function (e) {
                        e.stopPropagation();
                        markRead.mutate(n.id);
                    }} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Mark as read">
                    <lucide_react_1.Check className="h-3.5 w-3.5"/>
                  </button>)}
              </div>
            </div>);
        })}
      </div>
    </div>);
}
