import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaces } from "@/queries/useWorkspaces";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { AddWorkspaceDialog } from "./AddWorkspaceDialog";
import { RenameWorkspaceDialog } from "./RenameWorkspaceDialog";
import { DeleteWorkspaceDialog } from "./DeleteWorkspaceDialog";
import { AddRepoDialog } from "@/components/repository/AddRepoDialog";
import { cn } from "@/lib/utils";
import type { Workspace } from "@forge/shared";

const WORKSPACE_ICONS: Record<string, string> = {
  briefcase: "Briefcase",
  code: "Code",
  rocket: "Rocket",
  star: "Star",
  heart: "Heart",
  zap: "Zap",
};

function WorkspaceIcon({ workspace }: { workspace: Workspace }) {
  const initial = workspace.name[0]?.toUpperCase() ?? "W";
  return (
    <span className="text-xs font-semibold">{initial}</span>
  );
}

export function WorkspaceSwitcher() {
  const [showAdd, setShowAdd] = useState(false);
  const [showAddRepo, setShowAddRepo] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<Workspace | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const { data: workspaces } = useWorkspaces();
  const { activeWorkspaceId, setActiveWorkspaceId, setActivePage } = useWorkspaceStore();

  return (
    <>
      <div className="flex flex-col items-center gap-1">
        {workspaces?.map((ws, i) => (
          <DropdownMenu
            key={ws.id}
            open={menuOpenId === ws.id}
            onOpenChange={(open) => setMenuOpenId(open ? ws.id : null)}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={() => {
                      if (activeWorkspaceId === ws.id) {
                        setActivePage("home");
                      } else {
                        setActiveWorkspaceId(ws.id);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setMenuOpenId(ws.id);
                    }}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                      activeWorkspaceId === ws.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <WorkspaceIcon workspace={ws} />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">
                {ws.name}
                {i < 9 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {"\u2318"}{i + 1}
                  </span>
                )}
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="right" align="start">
              <DropdownMenuItem onClick={() => setRenameTarget(ws)}>
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteTarget(ws)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ))}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setShowAdd(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Plus className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Add Workspace</TooltipContent>
        </Tooltip>
      </div>

      <AddWorkspaceDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        onCreated={() => setShowAddRepo(true)}
      />
      <RenameWorkspaceDialog
        open={!!renameTarget}
        onOpenChange={() => setRenameTarget(null)}
        workspace={renameTarget}
      />
      <DeleteWorkspaceDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        workspace={deleteTarget}
      />
      <AddRepoDialog open={showAddRepo} onOpenChange={setShowAddRepo} />
    </>
  );
}
