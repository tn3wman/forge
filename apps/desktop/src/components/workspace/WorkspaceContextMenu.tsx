import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
} from "@/components/ui/context-menu";
import { WORKSPACE_COLORS } from "@/lib/workspaceColors";
import { useUpdateWorkspace, useDeleteWorkspace } from "@/queries/useWorkspaces";

interface WorkspaceContextMenuProps {
  workspaceId: string;
  currentColor: string;
  children: ReactNode;
}

export function WorkspaceContextMenu({
  workspaceId,
  currentColor,
  children,
}: WorkspaceContextMenuProps) {
  const updateWorkspace = useUpdateWorkspace();
  const deleteWorkspace = useDeleteWorkspace();

  function handleColorChange(colorId: string) {
    updateWorkspace.mutate({ id: workspaceId, request: { color: colorId } });
  }

  function handleDelete() {
    if (confirm("Are you sure you want to delete this workspace?")) {
      deleteWorkspace.mutate(workspaceId);
    }
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
                (currentColor === color.id
                  ? " ring-2 ring-white ring-offset-1 ring-offset-background"
                  : "")
              }
              style={{ backgroundColor: color.bg }}
            />
          ))}
        </div>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
          Delete Workspace
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
