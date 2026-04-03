"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StashList = StashList;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var lucide_react_1 = require("lucide-react");
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var git_1 = require("@/ipc/git");
var useGitMutations_1 = require("@/queries/useGitMutations");
function formatRelativeTime(timestamp) {
    var now = Date.now();
    var diffMs = now - timestamp * 1000;
    var diffSec = Math.floor(diffMs / 1000);
    var diffMin = Math.floor(diffSec / 60);
    var diffHour = Math.floor(diffMin / 60);
    var diffDay = Math.floor(diffHour / 24);
    if (diffSec < 60)
        return "just now";
    if (diffMin < 60)
        return "".concat(diffMin, "m ago");
    if (diffHour < 24)
        return "".concat(diffHour, "h ago");
    if (diffDay < 30)
        return "".concat(diffDay, "d ago");
    return "".concat(Math.floor(diffDay / 30), "mo ago");
}
function StashList(_a) {
    var localPath = _a.localPath;
    var _b = (0, react_query_1.useQuery)({
        queryKey: ["git-stash", localPath],
        queryFn: function () { return git_1.gitIpc.stashList(localPath); },
    }), _c = _b.data, stashes = _c === void 0 ? [] : _c, isLoading = _b.isLoading, error = _b.error;
    var stashPush = (0, useGitMutations_1.useStashPush)();
    var stashPop = (0, useGitMutations_1.useStashPop)();
    var stashApply = (0, useGitMutations_1.useStashApply)();
    var stashDrop = (0, useGitMutations_1.useStashDrop)();
    var _d = (0, react_1.useState)(false), showNewStash = _d[0], setShowNewStash = _d[1];
    var _e = (0, react_1.useState)(""), stashMessage = _e[0], setStashMessage = _e[1];
    var _f = (0, react_1.useState)(false), includeUntracked = _f[0], setIncludeUntracked = _f[1];
    var handleStashPush = function () {
        stashPush.mutate({
            path: localPath,
            message: stashMessage.trim() || undefined,
            includeUntracked: includeUntracked,
        }, {
            onSuccess: function () {
                setStashMessage("");
                setShowNewStash(false);
                setIncludeUntracked(false);
            },
        });
    };
    var handlePop = function (index) {
        stashPop.mutate({ path: localPath, index: index });
    };
    var handleApply = function (index) {
        stashApply.mutate({ path: localPath, index: index });
    };
    var handleDrop = function (index) {
        if (!window.confirm("Drop stash@{".concat(index, "}?")))
            return;
        stashDrop.mutate({ path: localPath, index: index });
    };
    if (isLoading) {
        return (<div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <lucide_react_1.Loader2 className="h-4 w-4 animate-spin"/>
        Loading stashes...
      </div>);
    }
    if (error) {
        return (<div className="p-4 text-sm text-destructive">
        Failed to load stashes: {error.message}
      </div>);
    }
    return (<div className="space-y-1">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-sm font-medium">Stashes</h3>
        <button_1.Button variant="ghost" size="sm" onClick={function () { return setShowNewStash(!showNewStash); }}>
          <lucide_react_1.Plus className="h-4 w-4"/>
          Stash Changes
        </button_1.Button>
      </div>

      {showNewStash && (<div className="space-y-2 px-3 pb-2">
          <input_1.Input value={stashMessage} onChange={function (e) { return setStashMessage(e.target.value); }} onKeyDown={function (e) { return e.key === "Enter" && handleStashPush(); }} placeholder="Stash message (optional)..." className="h-7 text-xs" autoFocus/>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={includeUntracked} onChange={function (e) { return setIncludeUntracked(e.target.checked); }} className="rounded"/>
              Include untracked
            </label>
            <button_1.Button variant="secondary" size="sm" onClick={handleStashPush} disabled={stashPush.isPending}>
              {stashPush.isPending ? (<lucide_react_1.Loader2 className="h-3 w-3 animate-spin"/>) : ("Stash")}
            </button_1.Button>
          </div>
        </div>)}

      {stashes.length === 0 ? (<p className="px-3 py-2 text-xs text-muted-foreground">No stashes</p>) : (<div>
          {stashes.map(function (stash) { return (<StashRow key={stash.index} stash={stash} onApply={function () { return handleApply(stash.index); }} onPop={function () { return handlePop(stash.index); }} onDrop={function () { return handleDrop(stash.index); }}/>); })}
        </div>)}
    </div>);
}
function StashRow(_a) {
    var stash = _a.stash, onApply = _a.onApply, onPop = _a.onPop, onDrop = _a.onDrop;
    return (<div className="group flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent">
      <lucide_react_1.Archive className="h-3 w-3 shrink-0 text-muted-foreground"/>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        stash@{"{"}
        {stash.index}
        {"}"}
      </span>
      <span className="min-w-0 flex-1 truncate">{stash.message}</span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatRelativeTime(stash.timestamp)}
      </span>
      <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
        <button_1.Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs" onClick={onApply} title="Apply">
          Apply
        </button_1.Button>
        <button_1.Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs" onClick={onPop} title="Pop">
          Pop
        </button_1.Button>
        <button_1.Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs text-destructive hover:text-destructive" onClick={onDrop} title="Drop">
          Drop
        </button_1.Button>
      </div>
    </div>);
}
