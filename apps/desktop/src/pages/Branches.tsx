import { GitBranch } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { BranchList } from "@/components/git/BranchList";
import { StashList } from "@/components/git/StashList";
import { GitRepoSelector } from "@/components/git/GitRepoSelector";

export function Branches() {
  const localPath = useWorkspaceStore((s) => s.selectedRepoLocalPath);

  if (!localPath) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <GitBranch className="h-10 w-10" />
        <p className="text-sm">Set a local path to manage branches</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        <GitRepoSelector />
      </div>
      <div className="flex-1 overflow-y-auto">
        <BranchList localPath={localPath} />
        <div className="mx-3 border-t border-border" />
        <StashList localPath={localPath} />
      </div>
    </div>
  );
}
