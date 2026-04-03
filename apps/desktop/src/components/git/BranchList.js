"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchList = BranchList;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var useGitBranches_1 = require("@/queries/useGitBranches");
var useGitMutations_1 = require("@/queries/useGitMutations");
var utils_1 = require("@/lib/utils");
function BranchList(_a) {
    var localPath = _a.localPath;
    var _b = (0, useGitBranches_1.useGitBranches)(localPath), _c = _b.data, branches = _c === void 0 ? [] : _c, isLoading = _b.isLoading, error = _b.error;
    var currentBranch = (0, useGitBranches_1.useCurrentBranch)(localPath).data;
    var createBranch = (0, useGitMutations_1.useCreateBranch)();
    var checkoutBranch = (0, useGitMutations_1.useCheckoutBranch)();
    var deleteBranch = (0, useGitMutations_1.useDeleteBranch)();
    var deleteRemoteBranch = (0, useGitMutations_1.useDeleteRemoteBranch)();
    var _d = (0, react_1.useState)(false), showNewBranch = _d[0], setShowNewBranch = _d[1];
    var _e = (0, react_1.useState)(""), newBranchName = _e[0], setNewBranchName = _e[1];
    var _f = (0, react_1.useState)(true), localExpanded = _f[0], setLocalExpanded = _f[1];
    var _g = (0, react_1.useState)(false), remoteExpanded = _g[0], setRemoteExpanded = _g[1];
    var _h = (0, react_1.useState)(null), actionError = _h[0], setActionError = _h[1];
    var _j = (0, react_1.useState)(null), pendingForceDelete = _j[0], setPendingForceDelete = _j[1];
    var localBranches = branches.filter(function (b) { return !b.isRemote; });
    var remoteBranches = branches.filter(function (b) { return b.isRemote; });
    var handleCreate = function () {
        var name = newBranchName.trim();
        if (!name)
            return;
        createBranch.mutate({ path: localPath, name: name }, {
            onSuccess: function () {
                setNewBranchName("");
                setShowNewBranch(false);
            },
        });
    };
    var handleCheckout = function (name) {
        setActionError(null);
        checkoutBranch.mutate({ path: localPath, name: name }, { onError: function (err) { return setActionError(err instanceof Error ? err.message : String(err)); } });
    };
    var handleDelete = function (name, force) {
        var msg = force
            ? "This will remove the worktree and delete branch \"".concat(name, "\". Continue?")
            : "Delete branch \"".concat(name, "\"?");
        if (!window.confirm(msg))
            return;
        setActionError(null);
        deleteBranch.mutate({ path: localPath, name: name, force: force }, {
            onError: function (err) {
                var message = err instanceof Error ? err.message : String(err);
                // If it's a worktree conflict, offer force delete
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
        // Parse "origin/feature-x" → remote: "origin", branch: "feature-x"
        var slashIndex = fullName.indexOf("/");
        if (slashIndex === -1)
            return;
        var remote = fullName.slice(0, slashIndex);
        var branch = fullName.slice(slashIndex + 1);
        if (!window.confirm("Delete remote branch '".concat(fullName, "'? This will remove it from the remote repository.")))
            return;
        setActionError(null);
        deleteRemoteBranch.mutate({ path: localPath, remote: remote, branch: branch }, {
            onError: function (err) {
                setActionError(err instanceof Error ? err.message : String(err));
            },
        });
    };
    if (isLoading) {
        return (<div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <lucide_react_1.Loader2 className="h-4 w-4 animate-spin"/>
        Loading branches...
      </div>);
    }
    if (error) {
        return (<div className="p-4 text-sm text-destructive">
        Failed to load branches: {error.message}
      </div>);
    }
    return (<div className="space-y-1">
      {/* New Branch */}
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-sm font-medium">Branches</h3>
        <button_1.Button variant="ghost" size="sm" onClick={function () { return setShowNewBranch(!showNewBranch); }}>
          <lucide_react_1.Plus className="h-4 w-4"/>
          New Branch
        </button_1.Button>
      </div>

      {showNewBranch && (<div className="flex items-center gap-2 px-3 pb-2">
          <input_1.Input value={newBranchName} onChange={function (e) { return setNewBranchName(e.target.value); }} onKeyDown={function (e) { return e.key === "Enter" && handleCreate(); }} placeholder="Branch name..." className="h-7 text-xs" autoFocus/>
          <button_1.Button variant="secondary" size="sm" onClick={handleCreate} disabled={!newBranchName.trim() || createBranch.isPending}>
            {createBranch.isPending ? (<lucide_react_1.Loader2 className="h-3 w-3 animate-spin"/>) : ("Create")}
          </button_1.Button>
        </div>)}

      {/* Error display */}
      {actionError && (<div className="mx-3 mb-1 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5">
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

      {/* Local Branches */}
      <CollapsibleSection label={"Local Branches (".concat(localBranches.length, ")")} expanded={localExpanded} onToggle={function () { return setLocalExpanded(!localExpanded); }}>
        {localBranches.map(function (branch) { return (<BranchRow key={branch.name} branch={branch} isCurrent={branch.isHead} onCheckout={function () { return handleCheckout(branch.name); }} onDelete={function () { return handleDelete(branch.name); }} checkoutPending={checkoutBranch.isPending}/>); })}
        {localBranches.length === 0 && (<p className="px-3 py-1 text-xs text-muted-foreground">
            No local branches
          </p>)}
      </CollapsibleSection>

      {/* Remote Branches */}
      <CollapsibleSection label={"Remote Branches (".concat(remoteBranches.length, ")")} expanded={remoteExpanded} onToggle={function () { return setRemoteExpanded(!remoteExpanded); }}>
        {remoteBranches.map(function (branch) { return (<BranchRow key={branch.name} branch={branch} isCurrent={false} isRemote onDelete={function () { return handleDeleteRemote(branch.name); }}/>); })}
        {remoteBranches.length === 0 && (<p className="px-3 py-1 text-xs text-muted-foreground">
            No remote branches
          </p>)}
      </CollapsibleSection>
    </div>);
}
function CollapsibleSection(_a) {
    var label = _a.label, expanded = _a.expanded, onToggle = _a.onToggle, children = _a.children;
    return (<div>
      <button onClick={onToggle} className="flex w-full items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        {expanded ? (<lucide_react_1.ChevronDown className="h-3 w-3"/>) : (<lucide_react_1.ChevronRight className="h-3 w-3"/>)}
        {label}
      </button>
      {expanded && <div>{children}</div>}
    </div>);
}
function BranchRow(_a) {
    var branch = _a.branch, isCurrent = _a.isCurrent, isRemote = _a.isRemote, onCheckout = _a.onCheckout, onDelete = _a.onDelete, checkoutPending = _a.checkoutPending;
    return (<div className={(0, utils_1.cn)("group flex items-center gap-2 px-3 py-1 text-xs hover:bg-accent", isCurrent && "bg-accent/50")}>
      {isCurrent ? (<span className="h-2 w-2 shrink-0 rounded-full bg-green-500"/>) : (<lucide_react_1.GitBranch className="h-3 w-3 shrink-0 text-muted-foreground"/>)}
      <span className="min-w-0 flex-1 truncate font-mono text-xs">
        {branch.name}
      </span>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        {branch.commitOid.slice(0, 7)}
      </span>
      {!isCurrent && (<div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
          {onCheckout && (<button_1.Button variant="ghost" size="icon" className="h-5 w-5" onClick={onCheckout} disabled={checkoutPending} title="Checkout">
              <lucide_react_1.Check className="h-3 w-3"/>
            </button_1.Button>)}
          {onDelete && (<button_1.Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={onDelete} title="Delete">
              <lucide_react_1.Trash2 className="h-3 w-3"/>
            </button_1.Button>)}
        </div>)}
    </div>);
}
