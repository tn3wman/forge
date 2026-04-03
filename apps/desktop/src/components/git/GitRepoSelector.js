"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitRepoSelector = GitRepoSelector;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var button_1 = require("@/components/ui/button");
var useRepositories_1 = require("@/queries/useRepositories");
var workspaceStore_1 = require("@/stores/workspaceStore");
function GitRepoSelector() {
    var _a;
    var _b = (0, workspaceStore_1.useWorkspaceStore)(), activeWorkspaceId = _b.activeWorkspaceId, selectedRepoLocalPath = _b.selectedRepoLocalPath;
    var setPath = (0, workspaceStore_1.useWorkspaceStore)(function (s) { return s.selectedRepoLocalPath; });
    var _c = (0, useRepositories_1.useRepositories)(activeWorkspaceId).data, repos = _c === void 0 ? [] : _c;
    var _d = (0, react_1.useState)(false), open = _d[0], setOpen = _d[1];
    var ref = (0, react_1.useRef)(null);
    var reposWithPath = repos.filter(function (r) { return !!r.localPath; });
    var activeRepo = reposWithPath.find(function (r) { return r.localPath === selectedRepoLocalPath; });
    // Close on outside click
    (0, react_1.useEffect)(function () {
        if (!open)
            return;
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return function () { return document.removeEventListener("mousedown", handleClick); };
    }, [open]);
    if (reposWithPath.length <= 1) {
        // Only one repo — just show the name, no dropdown
        return activeRepo ? (<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <lucide_react_1.Database className="h-3 w-3"/>
        <span className="font-mono truncate max-w-[200px]">{activeRepo.fullName}</span>
      </div>) : null;
    }
    return (<div ref={ref} className="relative">
      <button_1.Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={function () { return setOpen(function (v) { return !v; }); }}>
        <lucide_react_1.Database className="h-3 w-3"/>
        <span className="font-mono truncate max-w-[200px]">
          {(_a = activeRepo === null || activeRepo === void 0 ? void 0 : activeRepo.fullName) !== null && _a !== void 0 ? _a : "Select repo"}
        </span>
        <lucide_react_1.ChevronDown className="h-3 w-3"/>
      </button_1.Button>
      {open && (<div className="absolute top-full left-0 mt-1 z-50 min-w-[220px] max-h-[300px] overflow-y-auto rounded-md border border-border bg-background shadow-md">
          {reposWithPath.map(function (repo) { return (<button key={repo.id} className={(0, utils_1.cn)("w-full text-left px-3 py-1.5 text-xs hover:bg-accent/50 font-mono", repo.localPath === selectedRepoLocalPath && "bg-accent text-accent-foreground")} onClick={function () {
                    // Update the store's selectedRepoLocalPath
                    var _a = workspaceStore_1.useWorkspaceStore.getState(), activePage = _a.activePage, navigateToChanges = _a.navigateToChanges, navigateToCommitGraph = _a.navigateToCommitGraph, navigateToBranches = _a.navigateToBranches;
                    switch (activePage) {
                        case "changes":
                            navigateToChanges(repo.localPath);
                            break;
                        case "commit-graph":
                            navigateToCommitGraph(repo.localPath);
                            break;
                        case "branches":
                            navigateToBranches(repo.localPath);
                            break;
                    }
                    setOpen(false);
                }}>
              {repo.fullName}
            </button>); })}
        </div>)}
    </div>);
}
