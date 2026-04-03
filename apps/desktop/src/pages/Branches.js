"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Branches = Branches;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var TimeAgo_1 = require("@/components/common/TimeAgo");
var workspaceStore_1 = require("@/stores/workspaceStore");
var useWorkspaces_1 = require("@/queries/useWorkspaces");
var useGitBranches_1 = require("@/queries/useGitBranches");
var useGitMutations_1 = require("@/queries/useGitMutations");
var git_1 = require("@/ipc/git");
var react_query_1 = require("@tanstack/react-query");
var useWorkspaceTint_1 = require("@/hooks/useWorkspaceTint");
var workspaceColors_1 = require("@/lib/workspaceColors");
var GitRepoSelector_1 = require("@/components/git/GitRepoSelector");
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var utils_1 = require("@/lib/utils");
function Branches() {
    var localPath = (0, workspaceStore_1.useWorkspaceStore)(function (s) { return s.selectedRepoLocalPath; });
    var activeWorkspaceId = (0, workspaceStore_1.useWorkspaceStore)(function (s) { return s.activeWorkspaceId; });
    var workspaces = (0, useWorkspaces_1.useWorkspaces)().data;
    var tintStyle = (0, useWorkspaceTint_1.useWorkspaceTint)();
    var activeWorkspace = workspaces === null || workspaces === void 0 ? void 0 : workspaces.find(function (ws) { return ws.id === activeWorkspaceId; });
    var wsColorHex = activeWorkspace ? (0, workspaceColors_1.getWorkspaceColor)(activeWorkspace.color).bg : "#a1a1aa";
    var sectionHeaderStyle = { backgroundColor: "color-mix(in srgb, ".concat(wsColorHex, " 10%, transparent)"), borderColor: "color-mix(in srgb, ".concat(wsColorHex, " 20%, transparent)") };
    var _a = (0, react_1.useState)(true), localExpanded = _a[0], setLocalExpanded = _a[1];
    var _b = (0, react_1.useState)(true), remoteExpanded = _b[0], setRemoteExpanded = _b[1];
    var _c = (0, react_1.useState)(true), stashExpanded = _c[0], setStashExpanded = _c[1];
    var _d = (0, useGitBranches_1.useGitBranches)(localPath), _e = _d.data, branches = _e === void 0 ? [] : _e, isLoading = _d.isLoading;
    var currentBranch = (0, useGitBranches_1.useCurrentBranch)(localPath).data;
    var _f = (0, react_query_1.useQuery)({
        queryKey: ["git-stash", localPath],
        queryFn: function () { return git_1.gitIpc.stashList(localPath); },
        enabled: !!localPath,
    }).data, stashes = _f === void 0 ? [] : _f;
    var createBranch = (0, useGitMutations_1.useCreateBranch)();
    var checkoutBranch = (0, useGitMutations_1.useCheckoutBranch)();
    var deleteBranch = (0, useGitMutations_1.useDeleteBranch)();
    var deleteRemoteBranch = (0, useGitMutations_1.useDeleteRemoteBranch)();
    var stashPush = (0, useGitMutations_1.useStashPush)();
    var stashApply = (0, useGitMutations_1.useStashApply)();
    var stashDrop = (0, useGitMutations_1.useStashDrop)();
    var _g = (0, react_1.useState)(false), showNewBranch = _g[0], setShowNewBranch = _g[1];
    var _h = (0, react_1.useState)(""), newBranchName = _h[0], setNewBranchName = _h[1];
    var _j = (0, react_1.useState)(null), actionError = _j[0], setActionError = _j[1];
    var _k = (0, react_1.useState)(null), pendingForceDelete = _k[0], setPendingForceDelete = _k[1];
    var localBranches = branches.filter(function (b) { return !b.isRemote; });
    var remoteBranches = branches.filter(function (b) { return b.isRemote; });
    var handleCreate = function () {
        var name = newBranchName.trim();
        if (!name || !localPath)
            return;
        createBranch.mutate({ path: localPath, name: name }, {
            onSuccess: function () {
                setNewBranchName("");
                setShowNewBranch(false);
            },
        });
    };
    var handleCheckout = function (name) {
        if (!localPath)
            return;
        setActionError(null);
        checkoutBranch.mutate({ path: localPath, name: name }, { onError: function (err) { return setActionError(err instanceof Error ? err.message : String(err)); } });
    };
    var handleDelete = function (name, force) {
        if (!localPath)
            return;
        setActionError(null);
        deleteBranch.mutate({ path: localPath, name: name, force: force }, {
            onError: function (err) {
                var message = err instanceof Error ? err.message : String(err);
                if (message.includes("worktree")) {
                    setActionError(message);
                    setPendingForceDelete(name);
                }
                else {
                    setActionError(message);
                    setPendingForceDelete(null);
                }
            },
        });
    };
    var handleDeleteRemote = function (fullName) {
        if (!localPath)
            return;
        var slashIndex = fullName.indexOf("/");
        if (slashIndex === -1)
            return;
        var remote = fullName.slice(0, slashIndex);
        var branch = fullName.slice(slashIndex + 1);
        setActionError(null);
        deleteRemoteBranch.mutate({ path: localPath, remote: remote, branch: branch }, { onError: function (err) { return setActionError(err instanceof Error ? err.message : String(err)); } });
    };
    if (!localPath) {
        return (<div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <lucide_react_1.GitBranch className="h-8 w-8"/>
        <p className="text-sm">Set a local path to manage branches</p>
      </div>);
    }
    return (<div className="flex h-full flex-col">
      {/* Title bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 h-8" data-tauri-drag-region style={tintStyle}>
        <GitRepoSelector_1.GitRepoSelector />
        <div className="mx-1 h-4 w-px bg-border"/>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground shrink-0">
          Local {localBranches.length}
        </span>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground shrink-0">
          Remote {remoteBranches.length}
        </span>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground shrink-0">
          Stashes {stashes.length}
        </span>

        <div className="flex-1" data-tauri-drag-region/>

        <button onClick={function () { return setShowNewBranch(!showNewBranch); }} className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground hover:bg-accent/80 transition-colors shrink-0">
          <lucide_react_1.Plus className="h-3 w-3"/>
          New Branch
        </button>
      </div>

      {/* New branch input */}
      {showNewBranch && (<div className="flex items-center gap-2 px-4 py-2 border-b border-border">
          <input_1.Input value={newBranchName} onChange={function (e) { return setNewBranchName(e.target.value); }} onKeyDown={function (e) { return e.key === "Enter" && handleCreate(); }} placeholder="Branch name..." className="h-7 text-xs max-w-xs" autoFocus/>
          <button_1.Button variant="secondary" size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={!newBranchName.trim() || createBranch.isPending}>
            {createBranch.isPending ? <lucide_react_1.Loader2 className="h-3 w-3 animate-spin"/> : "Create"}
          </button_1.Button>
        </div>)}

      {/* Error */}
      {actionError && (<div className="mx-4 my-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5">
          <p className="text-xs text-red-400">{actionError}</p>
          {pendingForceDelete && (<button_1.Button variant="destructive" size="sm" className="mt-1.5 h-6 text-[10px]" onClick={function () {
                    var name = pendingForceDelete;
                    setPendingForceDelete(null);
                    setActionError(null);
                    handleDelete(name, true);
                }}>
              Force Delete (removes worktree)
            </button_1.Button>)}
        </div>)}

      {isLoading ? (<div className="flex items-center justify-center py-12 text-muted-foreground">
          <lucide_react_1.Loader2 className="h-5 w-5 animate-spin mr-2"/>
          <span className="text-sm">Loading branches...</span>
        </div>) : (<div className="flex flex-1 flex-col min-h-0" style={{ "--panel-height": "calc((100% - 78px) / 3)" }}>
          {/* Local Branches — accordion panel */}
          <button onClick={function () { return setLocalExpanded(!localExpanded); }} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider border-b shrink-0 cursor-pointer hover:brightness-110 transition-all" style={sectionHeaderStyle}>
            {localExpanded ? <lucide_react_1.ChevronDown className="h-3 w-3"/> : <lucide_react_1.ChevronRight className="h-3 w-3"/>}
            Local Branches ({localBranches.length})
          </button>
          {localExpanded && (<div className="min-h-0 overflow-y-auto" style={{ height: "var(--panel-height)" }}>
              {localBranches.map(function (branch) { return (<BranchRow key={branch.name} branch={branch} isCurrent={branch.isHead} onCheckout={function () { return handleCheckout(branch.name); }} onDelete={function () { return handleDelete(branch.name); }} checkoutPending={checkoutBranch.isPending}/>); })}
              {localBranches.length === 0 && (<p className="px-3 py-3 text-xs text-muted-foreground text-center">No local branches</p>)}
            </div>)}

          {/* Remote Branches — accordion panel */}
          <button onClick={function () { return setRemoteExpanded(!remoteExpanded); }} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider border-b shrink-0 cursor-pointer hover:brightness-110 transition-all" style={sectionHeaderStyle}>
            {remoteExpanded ? <lucide_react_1.ChevronDown className="h-3 w-3"/> : <lucide_react_1.ChevronRight className="h-3 w-3"/>}
            Remote Branches ({remoteBranches.length})
          </button>
          {remoteExpanded && (<div className="min-h-0 overflow-y-auto" style={{ height: "var(--panel-height)" }}>
              {remoteBranches.map(function (branch) { return (<BranchRow key={branch.name} branch={branch} isCurrent={false} isRemote onDelete={function () { return handleDeleteRemote(branch.name); }}/>); })}
              {remoteBranches.length === 0 && (<p className="px-3 py-3 text-xs text-muted-foreground text-center">No remote branches</p>)}
            </div>)}

          {/* Stashes — accordion panel */}
          <button onClick={function () { return setStashExpanded(!stashExpanded); }} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider border-b shrink-0 cursor-pointer hover:brightness-110 transition-all" style={sectionHeaderStyle}>
            {stashExpanded ? <lucide_react_1.ChevronDown className="h-3 w-3"/> : <lucide_react_1.ChevronRight className="h-3 w-3"/>}
            Stashes ({stashes.length})
            {localPath && (<span className="ml-auto text-[10px] normal-case tracking-normal text-muted-foreground hover:text-foreground" onClick={function (e) {
                    e.stopPropagation();
                    stashPush.mutate({ path: localPath });
                }}>
                + Stash Changes
              </span>)}
          </button>
          {stashExpanded && (<div className="min-h-0 overflow-y-auto" style={{ height: "var(--panel-height)" }}>
              {stashes.length === 0 ? (<p className="px-3 py-3 text-xs text-muted-foreground text-center">No stashes</p>) : (stashes.map(function (stash) { return (<div key={stash.index} className="flex items-center gap-2 px-3 h-8 text-xs hover:bg-accent/50 border-b border-border/50">
                    {/* Icon column — matches branch icon */}
                    <lucide_react_1.GitBranch className="h-3 w-3 shrink-0 text-muted-foreground"/>
                    <span className="text-muted-foreground font-mono shrink-0">
                      stash@{"{" + stash.index + "}"}
                    </span>
                    <span className="flex-1 min-w-0 truncate">{stash.message}</span>
                    {/* Spacers to align with branch columns: upstream + merged + hash + time */}
                    <div className="w-[220px] shrink-0"/>
                    <div className="w-[50px] shrink-0"/>
                    <div className="w-[55px] shrink-0"/>
                    <div className="w-[55px] shrink-0"/>
                    {/* Actions — same w-[52px] as branch rows */}
                    <div className="w-[52px] shrink-0 flex items-center justify-end gap-0.5">
                      <button_1.Button variant="ghost" size="icon" className="h-5 w-5" onClick={function () { return localPath && stashApply.mutate({ path: localPath, index: stash.index }); }} title="Apply">
                        <lucide_react_1.Check className="h-3 w-3"/>
                      </button_1.Button>
                      <button_1.Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={function () { return localPath && stashDrop.mutate({ path: localPath, index: stash.index }); }} title="Drop">
                        <lucide_react_1.Trash2 className="h-3 w-3"/>
                      </button_1.Button>
                    </div>
                  </div>); }))}
            </div>)}
        </div>)}
    </div>);
}
function BranchRow(_a) {
    var branch = _a.branch, isCurrent = _a.isCurrent, isRemote = _a.isRemote, onCheckout = _a.onCheckout, onDelete = _a.onDelete, checkoutPending = _a.checkoutPending;
    return (<div className={(0, utils_1.cn)("group flex items-center gap-2 px-3 h-8 text-xs hover:bg-accent/50 border-b border-border/50", isCurrent && "bg-accent/30")}>
      {isCurrent ? (<span className="h-2 w-2 shrink-0 rounded-full bg-green-500"/>) : (<lucide_react_1.GitBranch className="h-3 w-3 shrink-0 text-muted-foreground"/>)}
      <span className="min-w-0 flex-1 truncate font-mono text-xs">
        {branch.name}
      </span>
      {/* Upstream — fixed width, left-aligned */}
      <span className="w-[220px] shrink-0 text-[10px] text-muted-foreground truncate">
        {branch.upstream && !isRemote ? "\u2192 ".concat(branch.upstream) : ""}
      </span>
      {/* Merged — fixed width so column stays aligned */}
      <div className="w-[50px] shrink-0">
        {branch.isMerged && (<span className="rounded-full bg-purple-500/15 px-1.5 py-0 text-[10px] font-medium text-purple-400 leading-4">
            merged
          </span>)}
      </div>
      <span className="w-[55px] shrink-0 font-mono text-xs text-blue-400 text-right">
        {branch.commitOid.slice(0, 7)}
      </span>
      <div className="w-[55px] shrink-0 text-right">
        <TimeAgo_1.TimeAgo date={new Date(branch.commitTimestamp * 1000).toISOString()}/>
      </div>
      {/* Actions — fixed width so columns align even for current branch */}
      <div className="w-[52px] shrink-0 flex items-center justify-end gap-0.5">
        {!isCurrent && onCheckout && (<button_1.Button variant="ghost" size="icon" className="h-5 w-5" onClick={onCheckout} disabled={checkoutPending} title="Checkout">
            <lucide_react_1.Check className="h-3 w-3"/>
          </button_1.Button>)}
        {!isCurrent && onDelete && (<button_1.Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={onDelete} title="Delete">
            <lucide_react_1.Trash2 className="h-3 w-3"/>
          </button_1.Button>)}
      </div>
    </div>);
}
