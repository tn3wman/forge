import { useState } from "react";
import { Plus, Briefcase } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useWorkspaces } from "@/queries/useWorkspaces";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { AddWorkspaceDialog } from "./AddWorkspaceDialog";
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
  const { data: workspaces } = useWorkspaces();
  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspaceStore();

  return (
    <>
      <div className="flex flex-col items-center gap-1">
        {workspaces?.map((ws, i) => (
          <Tooltip key={ws.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveWorkspaceId(ws.id)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                  activeWorkspaceId === ws.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <WorkspaceIcon workspace={ws} />
              </button>
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

      <AddWorkspaceDialog open={showAdd} onOpenChange={setShowAdd} />
    </>
  );
}
