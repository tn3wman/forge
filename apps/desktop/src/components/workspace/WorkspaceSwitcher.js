"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceSwitcher = WorkspaceSwitcher;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var tooltip_1 = require("@/components/ui/tooltip");
var useWorkspaces_1 = require("@/queries/useWorkspaces");
var workspaceStore_1 = require("@/stores/workspaceStore");
var AddWorkspaceDialog_1 = require("./AddWorkspaceDialog");
var RenameWorkspaceDialog_1 = require("./RenameWorkspaceDialog");
var DeleteWorkspaceDialog_1 = require("./DeleteWorkspaceDialog");
var AddRepoDialog_1 = require("@/components/repository/AddRepoDialog");
var RepoSetupDialog_1 = require("@/components/repository/RepoSetupDialog");
var WorkspaceContextMenu_1 = require("./WorkspaceContextMenu");
var useRepositories_1 = require("@/queries/useRepositories");
var utils_1 = require("@/lib/utils");
var workspaceColors_1 = require("@/lib/workspaceColors");
function WorkspaceIcon(_a) {
    var _b, _c;
    var workspace = _a.workspace;
    var initial = (_c = (_b = workspace.name[0]) === null || _b === void 0 ? void 0 : _b.toUpperCase()) !== null && _c !== void 0 ? _c : "W";
    var color = (0, workspaceColors_1.getWorkspaceColor)(workspace.color);
    return (<span className="text-xs font-semibold" style={{ color: color.text }}>
      {initial}
    </span>);
}
function WorkspaceSwitcher() {
    var _a = (0, react_1.useState)(false), showAdd = _a[0], setShowAdd = _a[1];
    var _b = (0, react_1.useState)(false), showAddRepo = _b[0], setShowAddRepo = _b[1];
    var _c = (0, react_1.useState)(false), showRepoSetup = _c[0], setShowRepoSetup = _c[1];
    var _d = (0, react_1.useState)([]), reposToSetup = _d[0], setReposToSetup = _d[1];
    var _e = (0, react_1.useState)(null), renameTarget = _e[0], setRenameTarget = _e[1];
    var _f = (0, react_1.useState)(null), deleteTarget = _f[0], setDeleteTarget = _f[1];
    var workspaces = (0, useWorkspaces_1.useWorkspaces)().data;
    var _g = (0, workspaceStore_1.useWorkspaceStore)(), activeWorkspaceId = _g.activeWorkspaceId, setActiveWorkspaceId = _g.setActiveWorkspaceId, setActivePage = _g.setActivePage;
    var repos = (0, useRepositories_1.useRepositories)(activeWorkspaceId).data;
    function handleAddRepoClose(addedRepoIds) {
        if (!repos || addedRepoIds.length === 0)
            return;
        // Find newly-added repos that have no local path
        var unlinked = repos.filter(function (r) { return addedRepoIds.includes(r.id) && !r.localPath; });
        if (unlinked.length > 0) {
            setReposToSetup(unlinked);
            setShowRepoSetup(true);
        }
    }
    return (<>
      <div className="flex flex-col items-center gap-1">
        {workspaces === null || workspaces === void 0 ? void 0 : workspaces.map(function (ws, i) {
            var isActive = activeWorkspaceId === ws.id;
            var color = (0, workspaceColors_1.getWorkspaceColor)(ws.color);
            return (<div key={ws.id} className="relative flex items-center">
              {/* Active indicator pill */}
              <div className={(0, utils_1.cn)("absolute -left-2 w-1 rounded-full bg-white transition-all", isActive ? "h-5" : "h-0")}/>

              <tooltip_1.Tooltip>
                <WorkspaceContextMenu_1.WorkspaceContextMenu workspace={ws} onRename={function () { return setRenameTarget(ws); }} onDelete={function () { return setDeleteTarget(ws); }}>
                  <tooltip_1.TooltipTrigger asChild>
                    <button onClick={function () {
                    if (isActive) {
                        setActivePage("home");
                    }
                    else {
                        setActiveWorkspaceId(ws.id);
                    }
                }} className={(0, utils_1.cn)("flex h-12 w-12 items-center justify-center rounded-md transition-all", isActive
                    ? "opacity-100"
                    : "opacity-60 hover:opacity-90")} style={{ backgroundColor: color.bg }}>
                      <WorkspaceIcon workspace={ws}/>
                    </button>
                  </tooltip_1.TooltipTrigger>
                </WorkspaceContextMenu_1.WorkspaceContextMenu>
                <tooltip_1.TooltipContent side="right">
                  {ws.name}
                  {i < 9 && (<span className="ml-2 text-xs text-muted-foreground">
                      {"\u2318"}{i + 1}
                    </span>)}
                </tooltip_1.TooltipContent>
              </tooltip_1.Tooltip>
            </div>);
        })}

        <tooltip_1.Tooltip>
          <tooltip_1.TooltipTrigger asChild>
            <button onClick={function () { return setShowAdd(true); }} className="flex h-12 w-12 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
              <lucide_react_1.Plus className="h-5 w-5"/>
            </button>
          </tooltip_1.TooltipTrigger>
          <tooltip_1.TooltipContent side="right">Add Workspace</tooltip_1.TooltipContent>
        </tooltip_1.Tooltip>
      </div>

      <AddWorkspaceDialog_1.AddWorkspaceDialog open={showAdd} onOpenChange={setShowAdd} onCreated={function () { return setShowAddRepo(true); }}/>
      <RenameWorkspaceDialog_1.RenameWorkspaceDialog open={!!renameTarget} onOpenChange={function () { return setRenameTarget(null); }} workspace={renameTarget}/>
      <DeleteWorkspaceDialog_1.DeleteWorkspaceDialog open={!!deleteTarget} onOpenChange={function () { return setDeleteTarget(null); }} workspace={deleteTarget}/>
      <AddRepoDialog_1.AddRepoDialog open={showAddRepo} onOpenChange={setShowAddRepo} onClose={handleAddRepoClose}/>
      <RepoSetupDialog_1.RepoSetupDialog open={showRepoSetup} onOpenChange={setShowRepoSetup} repos={reposToSetup}/>
    </>);
}
