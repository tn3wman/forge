import { useState } from "react";
import { GitBranch, Lock, Plus, Trash2, FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useRepositories, useRemoveRepo } from "@/queries/useRepositories";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useSetLocalPath } from "@/queries/useGitMutations";
import { AddRepoDialog } from "./AddRepoDialog";
import type { Repository } from "@forge/shared";

export function RepoItem({ repo }: { repo: Repository }) {
  const removeRepo = useRemoveRepo();
  const setLocalPath = useSetLocalPath();

  async function handleSetLocalPath() {
    const selected = await open({ directory: true, title: `Select local clone of ${repo.fullName}` });
    if (selected) {
      setLocalPath.mutate({ repoId: repo.id, localPath: selected });
    }
  }

  return (
    <div className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
      <GitBranch className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{repo.fullName}</span>
      {repo.localPath && (
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" title="Local path set" />
      )}
      {repo.isPrivate && (
        <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
      )}
      {!repo.localPath && (
        <button
          onClick={handleSetLocalPath}
          className="hidden h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground group-hover:flex"
          aria-label={`Set local path for ${repo.fullName}`}
          title="Set local clone path"
        >
          <FolderOpen className="h-3 w-3" />
        </button>
      )}
      <button
        onClick={() => removeRepo.mutate(repo.id)}
        className="hidden h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive group-hover:flex"
        aria-label={`Remove ${repo.fullName}`}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

export function RepoList() {
  const [showAdd, setShowAdd] = useState(false);
  const { activeWorkspaceId } = useWorkspaceStore();
  const { data: repos, isLoading } = useRepositories(activeWorkspaceId);

  if (!activeWorkspaceId) {
    return (
      <div className="px-3 py-4 text-center text-xs text-muted-foreground">
        Select a workspace to see repositories
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          Repositories
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setShowAdd(true)}
              className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Add Repository</TooltipContent>
        </Tooltip>
      </div>

      <div className="px-1">
        {isLoading ? (
          <div className="px-2 py-4 text-center text-xs text-muted-foreground">
            Loading...
          </div>
        ) : repos?.length === 0 ? (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground hover:border-primary hover:text-primary"
          >
            Add your first repository
          </button>
        ) : (
          repos?.map((repo) => <RepoItem key={repo.id} repo={repo} />)
        )}
      </div>

      <AddRepoDialog open={showAdd} onOpenChange={setShowAdd} />
    </div>
  );
}
