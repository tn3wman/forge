import type { ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
} from "@/components/ui/context-menu";
import { WORKSPACE_COLORS } from "@/lib/workspaceColors";
import { useUpdateWorkspace } from "@/queries/useWorkspaces";
import type { Workspace } from "@forge/shared";

interface WorkspaceContextMenuProps {
  workspace: Workspace;
  onRename: () => void;
  onDelete: () => void;
  children: ReactNode;
}

export function WorkspaceContextMenu({
  workspace,
  onRename,
  onDelete,
  children,
}: WorkspaceContextMenuProps) {
  const updateWorkspace = useUpdateWorkspace();

  function handleColorChange(colorId: string) {
    updateWorkspace.mutate({ id: workspace.id, request: { color: colorId } });
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuLabel>Color</ContextMenuLabel>
        <div className="grid grid-cols-5 gap-1.5 px-2 py-1.5">
          {WORKSPACE_COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              aria-label={color.label}
              onClick={() => handleColorChange(color.id)}
              className={
                "h-6 w-6 rounded-full transition-transform hover:scale-110" +
                (workspace.color === color.id
                  ? " ring-2 ring-white ring-offset-1 ring-offset-background"
                  : "")
              }
              style={{ backgroundColor: color.bg }}
            />
          ))}
        </div>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onRename}>
          <Pencil className="h-4 w-4" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          Delete Workspace
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
