"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceContextMenu = WorkspaceContextMenu;
var lucide_react_1 = require("lucide-react");
var context_menu_1 = require("@/components/ui/context-menu");
var workspaceColors_1 = require("@/lib/workspaceColors");
var useWorkspaces_1 = require("@/queries/useWorkspaces");
function WorkspaceContextMenu(_a) {
    var workspace = _a.workspace, onRename = _a.onRename, onDelete = _a.onDelete, children = _a.children;
    var updateWorkspace = (0, useWorkspaces_1.useUpdateWorkspace)();
    function handleColorChange(colorId) {
        updateWorkspace.mutate({ id: workspace.id, request: { color: colorId } });
    }
    return (<context_menu_1.ContextMenu>
      <context_menu_1.ContextMenuTrigger asChild>{children}</context_menu_1.ContextMenuTrigger>
      <context_menu_1.ContextMenuContent className="w-48">
        <context_menu_1.ContextMenuLabel>Color</context_menu_1.ContextMenuLabel>
        <div className="grid grid-cols-5 gap-1.5 px-2 py-1.5">
          {workspaceColors_1.WORKSPACE_COLORS.map(function (color) { return (<button key={color.id} type="button" aria-label={color.label} onClick={function () { return handleColorChange(color.id); }} className={"h-6 w-6 rounded-full transition-transform hover:scale-110" +
                (workspace.color === color.id
                    ? " ring-2 ring-white ring-offset-1 ring-offset-background"
                    : "")} style={{ backgroundColor: color.bg }}/>); })}
        </div>
        <context_menu_1.ContextMenuSeparator />
        <context_menu_1.ContextMenuItem onClick={onRename}>
          <lucide_react_1.Pencil className="h-4 w-4"/>
          Rename
        </context_menu_1.ContextMenuItem>
        <context_menu_1.ContextMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
          <lucide_react_1.Trash2 className="h-4 w-4"/>
          Delete Workspace
        </context_menu_1.ContextMenuItem>
      </context_menu_1.ContextMenuContent>
    </context_menu_1.ContextMenu>);
}
