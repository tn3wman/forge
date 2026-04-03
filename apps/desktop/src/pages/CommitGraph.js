"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommitGraph = CommitGraph;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var useGitLog_1 = require("@/queries/useGitLog");
var useGitBranches_1 = require("@/queries/useGitBranches");
var workspaceStore_1 = require("@/stores/workspaceStore");
var CommitGraphCanvas_1 = require("@/components/git/CommitGraphCanvas");
var GitRepoSelector_1 = require("@/components/git/GitRepoSelector");
var useWorkspaceTint_1 = require("@/hooks/useWorkspaceTint");
var avatar_1 = require("@/components/ui/avatar");
var usePullRequests_1 = require("@/queries/usePullRequests");
var useIssues_1 = require("@/queries/useIssues");
var ROW_HEIGHT = 32;
var LANE_WIDTH = 20;
function formatRelativeTime(timestamp) {
    var seconds = Math.floor(Date.now() / 1000 - timestamp);
    if (seconds < 60)
        return "".concat(seconds, "s ago");
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60)
        return "".concat(minutes, "m ago");
    var hours = Math.floor(minutes / 60);
    if (hours < 24)
        return "".concat(hours, "h ago");
    var days = Math.floor(hours / 24);
    if (days < 30)
        return "".concat(days, "d ago");
    var months = Math.floor(days / 30);
    return "".concat(months, "mo ago");
}
function CommitGraph() {
    var _a, _b, _c;
    var selectedRepoLocalPath = (0, workspaceStore_1.useWorkspaceStore)(function (s) { return s.selectedRepoLocalPath; });
    var _d = (0, react_1.useState)(undefined), selectedBranch = _d[0], setSelectedBranch = _d[1];
    var _e = (0, react_1.useState)(false), branchMenuOpen = _e[0], setBranchMenuOpen = _e[1];
    var scrollRef = (0, react_1.useRef)(null);
    var _f = (0, react_1.useState)(0), scrollTop = _f[0], setScrollTop = _f[1];
    var tintStyle = (0, useWorkspaceTint_1.useWorkspaceTint)();
    var _g = (0, usePullRequests_1.usePullRequests)().data, prs = _g === void 0 ? [] : _g;
    var _h = (0, useIssues_1.useIssues)().data, issues = _h === void 0 ? [] : _h;
    var currentBranch = (0, useGitBranches_1.useCurrentBranch)(selectedRepoLocalPath).data;
    // Build GitHub login → avatar lookup, and a helper to resolve commit authors
    var ghUsersByLogin = (0, react_1.useMemo)(function () {
        var map = new Map();
        for (var _i = 0, prs_1 = prs; _i < prs_1.length; _i++) {
            var pr = prs_1[_i];
            map.set(pr.authorLogin.toLowerCase(), { login: pr.authorLogin, avatarUrl: pr.authorAvatarUrl });
        }
        for (var _a = 0, issues_1 = issues; _a < issues_1.length; _a++) {
            var issue = issues_1[_a];
            map.set(issue.authorLogin.toLowerCase(), { login: issue.authorLogin, avatarUrl: issue.authorAvatarUrl });
        }
        return map;
    }, [prs, issues]);
    // Resolve a commit's author email to a GitHub user
    function resolveGitHubUser(email) {
        // Try GitHub noreply email: {id}+{username}@users.noreply.github.com
        var noreplyMatch = email.match(/^\d+\+(.+)@users\.noreply\.github\.com$/);
        if (noreplyMatch) {
            var login = noreplyMatch[1].toLowerCase();
            var user = ghUsersByLogin.get(login);
            if (user)
                return user;
            // Even without PR/Issue data, we can construct the avatar URL
            return { login: noreplyMatch[1], avatarUrl: "https://avatars.githubusercontent.com/".concat(noreplyMatch[1]) };
        }
        // Try plain {username}@users.noreply.github.com
        var plainNoreply = email.match(/^(.+)@users\.noreply\.github\.com$/);
        if (plainNoreply) {
            var login = plainNoreply[1].toLowerCase();
            var user = ghUsersByLogin.get(login);
            if (user)
                return user;
            return { login: plainNoreply[1], avatarUrl: "https://avatars.githubusercontent.com/".concat(plainNoreply[1]) };
        }
        return undefined;
    }
    var _j = (0, useGitBranches_1.useGitBranches)(selectedRepoLocalPath).data, branches = _j === void 0 ? [] : _j;
    var activeBranch = (_a = selectedBranch !== null && selectedBranch !== void 0 ? selectedBranch : currentBranch) !== null && _a !== void 0 ? _a : undefined;
    var _k = (0, useGitLog_1.useGitLog)(selectedRepoLocalPath, activeBranch), data = _k.data, isLoading = _k.isLoading, isFetchingNextPage = _k.isFetchingNextPage, hasNextPage = _k.hasNextPage, fetchNextPage = _k.fetchNextPage;
    var rows = (0, react_1.useMemo)(function () { var _a; return (_a = data === null || data === void 0 ? void 0 : data.pages.flatMap(function (page) { return page; })) !== null && _a !== void 0 ? _a : []; }, [data]);
    // Build a map of branch tips for badge display
    var branchTips = (0, react_1.useMemo)(function () {
        var _a;
        var map = new Map();
        for (var _i = 0, branches_1 = branches; _i < branches_1.length; _i++) {
            var branch = branches_1[_i];
            if (branch.isRemote)
                continue;
            var existing = (_a = map.get(branch.commitOid)) !== null && _a !== void 0 ? _a : [];
            existing.push(branch);
            map.set(branch.commitOid, existing);
        }
        return map;
    }, [branches]);
    var maxColumn = (0, react_1.useMemo)(function () {
        var max = 0;
        for (var _i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
            var row = rows_1[_i];
            if (row.column > max)
                max = row.column;
            for (var _a = 0, _b = row.lines; _a < _b.length; _a++) {
                var line = _b[_a];
                if (line.fromColumn > max)
                    max = line.fromColumn;
                if (line.toColumn > max)
                    max = line.toColumn;
            }
        }
        return max;
    }, [rows]);
    var canvasWidth = Math.max(60, (maxColumn + 1) * LANE_WIDTH + LANE_WIDTH);
    var handleScroll = (0, react_1.useCallback)(function () {
        var el = scrollRef.current;
        if (!el)
            return;
        setScrollTop(el.scrollTop);
        // Infinite scroll: fetch more when near bottom
        var distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distanceToBottom < ROW_HEIGHT * 5 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
    if (!selectedRepoLocalPath) {
        return (<div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <lucide_react_1.GitCommit className="h-8 w-8 mb-2 opacity-50"/>
        <span className="text-sm">Select a repository to view the commit graph</span>
      </div>);
    }
    if (isLoading) {
        return (<div className="flex items-center justify-center h-full text-muted-foreground">
        <lucide_react_1.Loader2 className="h-5 w-5 animate-spin mr-2"/>
        <span className="text-sm">Loading commit history...</span>
      </div>);
    }
    return (<div className="flex flex-col h-full">
      {/* Repo + Branch selector */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 h-8" data-tauri-drag-region style={tintStyle}>
        <GitRepoSelector_1.GitRepoSelector />
        <div className="mx-1 h-4 w-px bg-border"/>
        <div className="relative">
          <button className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground hover:bg-accent/80 transition-colors" onClick={function () { return setBranchMenuOpen(function (prev) { return !prev; }); }}>
            <lucide_react_1.GitCommit className="h-3 w-3"/>
            {activeBranch !== null && activeBranch !== void 0 ? activeBranch : "All branches"}
            <lucide_react_1.ChevronDown className="h-3 w-3"/>
          </button>
          {branchMenuOpen && (<div className="absolute top-full left-0 mt-1 z-50 min-w-[200px] max-h-[300px] overflow-y-auto rounded-md border border-border bg-background shadow-md">
              <button className={(0, utils_1.cn)("w-full text-left px-3 py-1.5 text-xs hover:bg-accent/50", !selectedBranch && "bg-accent text-accent-foreground")} onClick={function () {
                setSelectedBranch(undefined);
                setBranchMenuOpen(false);
            }}>
                Default ({currentBranch !== null && currentBranch !== void 0 ? currentBranch : "HEAD"})
              </button>
              {branches
                .filter(function (b) { return !b.isRemote; })
                .map(function (branch) { return (<button key={branch.name} className={(0, utils_1.cn)("w-full text-left px-3 py-1.5 text-xs hover:bg-accent/50", selectedBranch === branch.name &&
                    "bg-accent text-accent-foreground")} onClick={function () {
                    setSelectedBranch(branch.name);
                    setBranchMenuOpen(false);
                }}>
                    {branch.name}
                    {branch.isHead && (<span className="ml-1 text-muted-foreground">
                        (HEAD)
                      </span>)}
                  </button>); })}
            </div>)}
        </div>
        <div className="flex-1" data-tauri-drag-region/>
        <span className="text-xs text-muted-foreground shrink-0">
          {rows.length} commits
        </span>
      </div>

      {/* Commit graph and list */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto relative">
        <div style={{ height: rows.length * ROW_HEIGHT }} className="relative">
          {/* Canvas overlay for graph lanes */}
          <div className="sticky left-0 top-0 h-full float-left" style={{ width: canvasWidth, height: (_c = (_b = scrollRef.current) === null || _b === void 0 ? void 0 : _b.clientHeight) !== null && _c !== void 0 ? _c : "100%" }}>
            <CommitGraphCanvas_1.CommitGraphCanvas rows={rows} rowHeight={ROW_HEIGHT} scrollTop={scrollTop} width={canvasWidth}/>
          </div>

          {/* Commit rows */}
          <div style={{ marginLeft: canvasWidth }}>
            {rows.map(function (row) {
            var branchLabels = branchTips.get(row.commit.oid);
            return (<div key={row.commit.oid} className="flex items-center gap-2 px-2 hover:bg-accent/50" style={{ height: ROW_HEIGHT }}>
                  {/* Commit hash */}
                  <span className="font-mono text-xs text-blue-400 shrink-0 w-[60px]">
                    {row.commit.shortId}
                  </span>

                  {/* Branch badges column */}
                  <div className="w-[160px] shrink-0 flex items-center gap-1 overflow-hidden">
                    {branchLabels === null || branchLabels === void 0 ? void 0 : branchLabels.map(function (b) { return (<span key={b.name} className="shrink-0 rounded-full border border-border bg-muted px-1.5 py-0 text-[10px] text-muted-foreground leading-4 whitespace-nowrap">
                        {b.name}
                      </span>); })}
                  </div>

                  {/* Commit message (flexible) */}
                  <span className="text-xs text-foreground truncate min-w-0 flex-1">
                    {row.commit.message.split("\n")[0]}
                  </span>

                  {/* Author with avatar */}
                  <div className="w-[100px] shrink-0 flex items-center gap-1.5 justify-end overflow-hidden">
                    {(function () {
                    var _a;
                    var ghUser = resolveGitHubUser(row.commit.authorEmail);
                    var displayName = (_a = ghUser === null || ghUser === void 0 ? void 0 : ghUser.login) !== null && _a !== void 0 ? _a : row.commit.author;
                    return (<>
                          <span className="text-xs text-muted-foreground truncate">
                            {displayName}
                          </span>
                          <avatar_1.Avatar className="h-5 w-5 shrink-0">
                            {(ghUser === null || ghUser === void 0 ? void 0 : ghUser.avatarUrl) && (<avatar_1.AvatarImage src={ghUser.avatarUrl} alt={displayName}/>)}
                            <avatar_1.AvatarFallback className="text-[9px] bg-accent">
                              {displayName.slice(0, 2).toUpperCase()}
                            </avatar_1.AvatarFallback>
                          </avatar_1.Avatar>
                        </>);
                })()}
                  </div>

                  {/* Time */}
                  <span className="text-xs text-muted-foreground shrink-0 w-[55px] text-right">
                    {formatRelativeTime(row.commit.timestamp)}
                  </span>
                </div>);
        })}
          </div>
        </div>

        {isFetchingNextPage && (<div className="flex items-center justify-center py-3 text-muted-foreground">
            <lucide_react_1.Loader2 className="h-4 w-4 animate-spin mr-2"/>
            <span className="text-xs">Loading more commits...</span>
          </div>)}
      </div>
    </div>);
}
