import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWorkspaces } from "@/queries/useWorkspaces";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { AddWorkspaceDialog } from "./AddWorkspaceDialog";
import { RenameWorkspaceDialog } from "./RenameWorkspaceDialog";
import { DeleteWorkspaceDialog } from "./DeleteWorkspaceDialog";
import { AddRepoDialog } from "@/components/repository/AddRepoDialog";
import { RepoSetupDialog } from "@/components/repository/RepoSetupDialog";
import { WorkspaceContextMenu } from "./WorkspaceContextMenu";
import { useRepositories } from "@/queries/useRepositories";
import { cn } from "@/lib/utils";
import { getWorkspaceColor } from "@/lib/workspaceColors";
import type { Workspace, Repository } from "@forge/shared";

function WorkspaceIcon({ workspace }: { workspace: Workspace }) {
  const initial = workspace.name[0]?.toUpperCase() ?? "W";
  const color = getWorkspaceColor(workspace.color);
  return (
    <span className="text-xs font-semibold" style={{ color: color.text }}>
      {initial}
    </span>
  );
}

export function WorkspaceSwitcher() {
  const [showAdd, setShowAdd] = useState(false);
  const [showAddRepo, setShowAddRepo] = useState(false);
  const [showRepoSetup, setShowRepoSetup] = useState(false);
  const [reposToSetup, setReposToSetup] = useState<Repository[]>([]);
  const [renameTarget, setRenameTarget] = useState<Workspace | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const { data: workspaces } = useWorkspaces();
  const { activeWorkspaceId, setActiveWorkspaceId, setActivePage } = useWorkspaceStore();
  const { data: repos } = useRepositories(activeWorkspaceId);

  function handleAddRepoClose(addedRepoIds: string[]) {
    if (!repos || addedRepoIds.length === 0) return;
    // Find newly-added repos that have no local path
    const unlinked = repos.filter(
      (r) => addedRepoIds.includes(r.id) && !r.localPath
    );
    if (unlinked.length > 0) {
      setReposToSetup(unlinked);
      setShowRepoSetup(true);
    }
  }

  return (
    <>
      <div className="flex flex-col items-center gap-1">
        {workspaces?.map((ws, i) => {
          const isActive = activeWorkspaceId === ws.id;
          const color = getWorkspaceColor(ws.color);

          return (
            <div key={ws.id} className="relative flex items-center">
              {/* Active indicator pill */}
              <div
                className={cn(
                  "absolute -left-2 w-1 rounded-full bg-white transition-all",
                  isActive ? "h-5" : "h-0",
                )}
              />

              <Tooltip>
                <WorkspaceContextMenu
                  workspace={ws}
                  onRename={() => setRenameTarget(ws)}
                  onDelete={() => setDeleteTarget(ws)}
                >
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        if (isActive) {
                          setActivePage("home");
                        } else {
                          setActiveWorkspaceId(ws.id);
                        }
                      }}
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-md transition-all",
                        isActive
                          ? "opacity-100"
                          : "opacity-60 hover:opacity-90",
                      )}
                      style={{ backgroundColor: color.bg }}
                    >
                      <WorkspaceIcon workspace={ws} />
                    </button>
                  </TooltipTrigger>
                </WorkspaceContextMenu>
                <TooltipContent side="right">
                  {ws.name}
                  {i < 9 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {"\u2318"}{i + 1}
                    </span>
                  )}
                </TooltipContent>
              </Tooltip>
            </div>
          );
        })}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setShowAdd(true)}
              className="flex h-12 w-12 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Plus className="h-5 w-5" />
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
      <AddRepoDialog open={showAddRepo} onOpenChange={setShowAddRepo} onClose={handleAddRepoClose} />
      <RepoSetupDialog open={showRepoSetup} onOpenChange={setShowRepoSetup} repos={reposToSetup} />
    </>
  );
}
