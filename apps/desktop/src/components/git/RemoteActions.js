"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteActions = RemoteActions;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var button_1 = require("@/components/ui/button");
var useGitBranches_1 = require("@/queries/useGitBranches");
var useGitMutations_1 = require("@/queries/useGitMutations");
var useWorkspaceTint_1 = require("@/hooks/useWorkspaceTint");
var GitRepoSelector_1 = require("./GitRepoSelector");
function RemoteActions(_a) {
    var localPath = _a.localPath;
    var currentBranch = (0, useGitBranches_1.useCurrentBranch)(localPath).data;
    var fetchMutation = (0, useGitMutations_1.useGitFetch)();
    var pullMutation = (0, useGitMutations_1.useGitPull)();
    var pushMutation = (0, useGitMutations_1.useGitPush)();
    var _b = (0, react_1.useState)(null), actionError = _b[0], setActionError = _b[1];
    var tintStyle = (0, useWorkspaceTint_1.useWorkspaceTint)();
    return (<div className="flex shrink-0 items-center gap-2 border-b border-border px-4 h-8" data-tauri-drag-region style={tintStyle}>
      <GitRepoSelector_1.GitRepoSelector />

      <div className="mx-1 h-4 w-px bg-border"/>

      {/* Current branch (read-only) */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <lucide_react_1.GitBranch className="h-3 w-3"/>
        <span className="font-mono truncate max-w-[240px]">
          {currentBranch !== null && currentBranch !== void 0 ? currentBranch : "..."}
        </span>
      </div>

      <div className="flex-1" data-tauri-drag-region/>

      <button_1.Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={function () { return fetchMutation.mutate({ path: localPath }); }} disabled={fetchMutation.isPending} title="Fetch">
        {fetchMutation.isPending ? (<lucide_react_1.Loader2 className="h-3 w-3 animate-spin"/>) : (<lucide_react_1.ArrowDown className="h-3 w-3"/>)}
        Fetch
      </button_1.Button>

      <button_1.Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={function () { return pullMutation.mutate({ path: localPath }); }} disabled={pullMutation.isPending} title="Pull">
        {pullMutation.isPending ? (<lucide_react_1.Loader2 className="h-3 w-3 animate-spin"/>) : (<lucide_react_1.ArrowDownToLine className="h-3 w-3"/>)}
        Pull
      </button_1.Button>

      <button_1.Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={function () { return pushMutation.mutate({ path: localPath }); }} disabled={pushMutation.isPending} title="Push">
        {pushMutation.isPending ? (<lucide_react_1.Loader2 className="h-3 w-3 animate-spin"/>) : (<lucide_react_1.ArrowUpFromLine className="h-3 w-3"/>)}
        Push
      </button_1.Button>

      {actionError && (<div className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5">
          <p className="text-xs text-red-400">{actionError}</p>
        </div>)}
    </div>);
}
