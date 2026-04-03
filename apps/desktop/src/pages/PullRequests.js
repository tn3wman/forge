"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullRequests = PullRequests;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var useWorkspaceTint_1 = require("@/hooks/useWorkspaceTint");
var usePullRequests_1 = require("@/queries/usePullRequests");
var PrListItem_1 = require("@/components/github/PrListItem");
var workspaceStore_1 = require("@/stores/workspaceStore");
var input_1 = require("@/components/ui/input");
var utils_1 = require("@/lib/utils");
var PR_FILTERS = [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
    { value: "closed", label: "Closed" },
    { value: "review_requested", label: "Review Requested" },
    { value: "draft", label: "Draft" },
];
function filterPrs(prs, filter, query) {
    var filtered = prs;
    switch (filter) {
        case "open":
            filtered = prs.filter(function (pr) { return pr.state === "open" && !pr.draft; });
            break;
        case "closed":
            filtered = prs.filter(function (pr) { return pr.state === "closed" || pr.state === "merged"; });
            break;
        case "review_requested":
            filtered = prs.filter(function (pr) { return pr.reviewDecision === "REVIEW_REQUIRED"; });
            break;
        case "draft":
            filtered = prs.filter(function (pr) { return pr.draft; });
            break;
    }
    if (query.trim()) {
        var q_1 = query.toLowerCase();
        filtered = filtered.filter(function (pr) {
            return pr.title.toLowerCase().includes(q_1) ||
                pr.authorLogin.toLowerCase().includes(q_1) ||
                String(pr.number).includes(q_1);
        });
    }
    return filtered;
}
function PullRequests() {
    var _a = (0, react_1.useState)("open"), activeFilter = _a[0], setActiveFilter = _a[1];
    var _b = (0, react_1.useState)(""), searchQuery = _b[0], setSearchQuery = _b[1];
    var navigateToPr = (0, workspaceStore_1.useWorkspaceStore)().navigateToPr;
    var tintStyle = (0, useWorkspaceTint_1.useWorkspaceTint)();
    var _c = (0, usePullRequests_1.usePullRequests)(), _d = _c.data, pullRequests = _d === void 0 ? [] : _d, isLoading = _c.isLoading, error = _c.error;
    var filterCounts = (0, react_1.useMemo)(function () {
        var counts = {};
        for (var _i = 0, PR_FILTERS_1 = PR_FILTERS; _i < PR_FILTERS_1.length; _i++) {
            var f = PR_FILTERS_1[_i];
            counts[f.value] = filterPrs(pullRequests, f.value, "").length;
        }
        return counts;
    }, [pullRequests]);
    var filteredPrs = (0, react_1.useMemo)(function () { return filterPrs(pullRequests, activeFilter, searchQuery); }, [pullRequests, activeFilter, searchQuery]);
    return (<div className="flex flex-col h-full">
      {/* Title bar with filters — matches Issues page pattern */}
      <div className="relative flex shrink-0 items-center gap-2 border-b border-border px-4 h-8" data-tauri-drag-region style={tintStyle}>
        {PR_FILTERS.map(function (f) { return (<button key={f.value} onClick={function () { return setActiveFilter(f.value); }} className={(0, utils_1.cn)("rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors shrink-0", activeFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-accent-foreground hover:bg-accent/80")}>
            {f.label}
            {filterCounts[f.value] != null && (<span className="ml-1 opacity-70">{filterCounts[f.value]}</span>)}
          </button>); })}

        {/* Search bar — centered in the window, clamped so it can't overlap pills */}
        <div className="fixed top-1 z-10" style={{ left: "max(50vw - 112px, 540px)" }}>
          <div className="relative">
            <lucide_react_1.Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground"/>
            <input_1.Input value={searchQuery} onChange={function (e) { return setSearchQuery(e.target.value); }} placeholder="Filter pull requests..." className="h-6 pl-7 text-xs w-56 rounded-[10px]"/>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (<div className="flex items-center justify-center py-12 text-muted-foreground">
            <lucide_react_1.Loader2 className="h-5 w-5 animate-spin mr-2"/>
            <span className="text-sm">Loading pull requests...</span>
          </div>)}

        {error && (<div className="flex items-center justify-center py-12 text-destructive">
            <span className="text-sm">Failed to load pull requests</span>
          </div>)}

        {!isLoading && !error && filteredPrs.length === 0 && (<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <lucide_react_1.GitPullRequest className="h-8 w-8 mb-2 opacity-40"/>
            <span className="text-sm">No pull requests found</span>
          </div>)}

        {filteredPrs.map(function (pr) { return (<PrListItem_1.PrListItem key={pr.id} pr={pr} onClick={function () { return pr.repoFullName && navigateToPr(pr.repoFullName, pr.number); }}/>); })}
      </div>
    </div>);
}
