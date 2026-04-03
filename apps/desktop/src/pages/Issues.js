"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Issues = Issues;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var useIssues_1 = require("@/queries/useIssues");
var IssueListItem_1 = require("@/components/github/IssueListItem");
var StartWorkDialog_1 = require("@/components/github/StartWorkDialog");
var workspaceStore_1 = require("@/stores/workspaceStore");
var useLinkedItems_1 = require("@/hooks/useLinkedItems");
var useWorkspaceTint_1 = require("@/hooks/useWorkspaceTint");
var input_1 = require("@/components/ui/input");
var utils_1 = require("@/lib/utils");
var ISSUE_FILTERS = [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
    { value: "closed", label: "Closed" },
];
function filterIssues(issues, filter, query) {
    var filtered = issues;
    switch (filter) {
        case "open":
            filtered = issues.filter(function (i) { return i.state === "open"; });
            break;
        case "closed":
            filtered = issues.filter(function (i) { return i.state === "closed"; });
            break;
    }
    if (query.trim()) {
        var q_1 = query.toLowerCase();
        filtered = filtered.filter(function (issue) {
            return issue.title.toLowerCase().includes(q_1) ||
                issue.authorLogin.toLowerCase().includes(q_1) ||
                String(issue.number).includes(q_1);
        });
    }
    return filtered;
}
function Issues() {
    var _a = (0, react_1.useState)("open"), activeFilter = _a[0], setActiveFilter = _a[1];
    var _b = (0, react_1.useState)(""), searchQuery = _b[0], setSearchQuery = _b[1];
    var _c = (0, react_1.useState)(null), startWorkIssue = _c[0], setStartWorkIssue = _c[1];
    var navigateToIssue = (0, workspaceStore_1.useWorkspaceStore)().navigateToIssue;
    var tintStyle = (0, useWorkspaceTint_1.useWorkspaceTint)();
    var _d = (0, useIssues_1.useIssues)(), _e = _d.data, issues = _e === void 0 ? [] : _e, isLoading = _d.isLoading, error = _d.error;
    var linkedPrMap = (0, useLinkedItems_1.useIssueLinkedPrs)();
    var filterCounts = (0, react_1.useMemo)(function () {
        var counts = {};
        for (var _i = 0, ISSUE_FILTERS_1 = ISSUE_FILTERS; _i < ISSUE_FILTERS_1.length; _i++) {
            var f = ISSUE_FILTERS_1[_i];
            counts[f.value] = filterIssues(issues, f.value, "").length;
        }
        return counts;
    }, [issues]);
    var filteredIssues = (0, react_1.useMemo)(function () { return filterIssues(issues, activeFilter, searchQuery); }, [issues, activeFilter, searchQuery]);
    return (<div className="flex flex-col h-full">
      {/* Title bar with filters — aligned with macOS traffic lights */}
      <div className="relative flex shrink-0 items-center gap-2 border-b border-border px-4 h-8" data-tauri-drag-region style={tintStyle}>
        {ISSUE_FILTERS.map(function (f) { return (<button key={f.value} onClick={function () { return setActiveFilter(f.value); }} className={(0, utils_1.cn)("rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors shrink-0", activeFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-accent-foreground hover:bg-accent/80")}>
            {f.label}
            {filterCounts[f.value] != null && (<span className="ml-1 opacity-70">{filterCounts[f.value]}</span>)}
          </button>); })}

        {/* Search bar — centered in the window, clamped so it can't overlap pills */}
        <div className="fixed top-1 z-10" style={{ left: "max(50vw - 112px, 400px)" }}>
          <div className="relative">
            <lucide_react_1.Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground"/>
            <input_1.Input value={searchQuery} onChange={function (e) { return setSearchQuery(e.target.value); }} placeholder="Filter issues..." className="h-6 pl-7 text-xs w-56 rounded-[10px]"/>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (<div className="flex items-center justify-center py-12 text-muted-foreground">
            <lucide_react_1.Loader2 className="h-5 w-5 animate-spin mr-2"/>
            <span className="text-sm">Loading issues...</span>
          </div>)}

        {error && (<div className="flex items-center justify-center py-12 text-destructive">
            <span className="text-sm">Failed to load issues</span>
          </div>)}

        {!isLoading && !error && filteredIssues.length === 0 && (<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <lucide_react_1.CircleDot className="h-8 w-8 mb-2 opacity-40"/>
            <span className="text-sm">No issues found</span>
          </div>)}

        {filteredIssues.map(function (issue) { return (<IssueListItem_1.IssueListItem key={issue.id} issue={issue} linkedPrs={linkedPrMap.get("".concat(issue.repoFullName, "#").concat(issue.number))} onClick={function () { return issue.repoFullName && navigateToIssue(issue.repoFullName, issue.number); }} onStartWork={function () { return setStartWorkIssue(issue); }}/>); })}
      </div>

      {startWorkIssue && (<StartWorkDialog_1.StartWorkDialog open={!!startWorkIssue} onOpenChange={function (open) { if (!open)
            setStartWorkIssue(null); }} issue={startWorkIssue} linkedPrs={linkedPrMap.get("".concat(startWorkIssue.repoFullName, "#").concat(startWorkIssue.number))}/>)}
    </div>);
}
