import { useState } from "react";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useGitStatus } from "@/queries/useGitStatus";
import { useGitDiff } from "@/queries/useGitDiff";
import { StagingArea } from "@/components/git/StagingArea";
import { CommitForm } from "@/components/git/CommitForm";
import { GitDiffViewer } from "@/components/git/GitDiffViewer";
import { RemoteActions } from "@/components/git/RemoteActions";

export function Changes() {
  const localPath = useWorkspaceStore((s) => s.selectedRepoLocalPath);
  const [selectedFile, setSelectedFile] = useState<{
    path: string;
    staged: boolean;
  } | null>(null);

  const { data: files = [] } = useGitStatus(localPath);
  const stagedCount = files.filter((f) => f.staged).length;
  const totalChangeCount = files.length;

  const { data: diffEntries = [] } = useGitDiff(
    localPath,
    selectedFile?.staged ?? false,
    selectedFile?.path,
  );

  if (!localPath) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Set a local path to view changes
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top toolbar */}
      <RemoteActions localPath={localPath} />

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel: staging + commit */}
        <div className="flex w-72 shrink-0 flex-col border-r border-border overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <StagingArea
              localPath={localPath}
              selectedFile={selectedFile}
              onSelectFile={(path, staged) => setSelectedFile({ path, staged })}
            />
          </div>
          <CommitForm localPath={localPath} stagedCount={stagedCount} totalChangeCount={totalChangeCount} />
        </div>

        {/* Right panel: diff viewer */}
        <div className="flex-1 overflow-auto p-4">
          <GitDiffViewer entries={diffEntries} selectedFile={selectedFile?.path} />
        </div>
      </div>
    </div>
  );
}
