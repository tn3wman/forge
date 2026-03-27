import { useState, useCallback } from "react";
import { GitCommitHorizontal, ChevronDown, Upload, GitPullRequest } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTerminalStore } from "@/stores/terminalStore";
import { useAuthStore } from "@/stores/authStore";
import { useGitStatus } from "@/queries/useGitStatus";
import { useStageAll, useCommit, useGitPush } from "@/queries/useGitMutations";
import { CommitMessageDialog } from "./CommitMessageDialog";
import { CreatePrDialog } from "./CreatePrDialog";

type DialogMode = "commit" | "commit-push" | "create-pr" | null;

export function CommitPushButton() {
  const { tabs, activeTabId } = useTerminalStore();
  const token = useAuthStore((s) => s.token);
  const activeTab = tabs.find((t) => t.tabId === activeTabId);
  const workingDirectory = activeTab?.workingDirectory ?? null;

  const { data: status } = useGitStatus(workingDirectory);
  const stageAll = useStageAll();
  const commit = useCommit();
  const push = useGitPush();

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = (status?.length ?? 0) > 0;
  const isLoading = stageAll.isPending || commit.isPending || push.isPending || isRunning;

  const handleCommitAndPush = useCallback(
    async (message: string) => {
      if (!workingDirectory) return;
      setIsRunning(true);
      setError(null);
      try {
        await stageAll.mutateAsync({ path: workingDirectory });
        await commit.mutateAsync({ path: workingDirectory, message });
        await push.mutateAsync({ path: workingDirectory });
        setDialogMode(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsRunning(false);
      }
    },
    [workingDirectory, stageAll, commit, push],
  );

  const handleCommitOnly = useCallback(
    async (message: string) => {
      if (!workingDirectory) return;
      setIsRunning(true);
      setError(null);
      try {
        await stageAll.mutateAsync({ path: workingDirectory });
        await commit.mutateAsync({ path: workingDirectory, message });
        setDialogMode(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsRunning(false);
      }
    },
    [workingDirectory, stageAll, commit],
  );

  const handlePush = useCallback(async () => {
    if (!workingDirectory) return;
    setIsRunning(true);
    setError(null);
    try {
      await push.mutateAsync({ path: workingDirectory });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsRunning(false);
    }
  }, [workingDirectory, push]);

  // Don't render if no working directory (no git repo context)
  if (!workingDirectory) return null;

  return (
    <>
      <div className="inline-flex items-center">
        <Button
          size="sm"
          disabled={!hasChanges || isLoading}
          onClick={() => {
            setError(null);
            setDialogMode("commit-push");
          }}
          className="h-6 rounded-r-none px-2 text-xs"
        >
          <GitCommitHorizontal className="mr-1 h-3 w-3" />
          Commit & push
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              disabled={isLoading}
              className="h-6 rounded-l-none border-l border-primary-foreground/20 px-1"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={!hasChanges}
              onClick={() => {
                setError(null);
                setDialogMode("commit");
              }}
            >
              <GitCommitHorizontal className="mr-2 h-4 w-4" />
              Commit
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!token} onClick={handlePush}>
              <Upload className="mr-2 h-4 w-4" />
              Push
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!token}
              onClick={() => {
                setError(null);
                setDialogMode("create-pr");
              }}
            >
              <GitPullRequest className="mr-2 h-4 w-4" />
              Create PR
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommitMessageDialog
        open={dialogMode === "commit-push"}
        onOpenChange={(v) => !v && setDialogMode(null)}
        onConfirm={handleCommitAndPush}
        title="Commit & Push"
        isLoading={isLoading}
        error={error}
      />

      <CommitMessageDialog
        open={dialogMode === "commit"}
        onOpenChange={(v) => !v && setDialogMode(null)}
        onConfirm={handleCommitOnly}
        title="Commit"
        isLoading={isLoading}
        error={error}
      />

      {workingDirectory && (
        <CreatePrDialog
          open={dialogMode === "create-pr"}
          onOpenChange={(v) => !v && setDialogMode(null)}
          workingDirectory={workingDirectory}
        />
      )}
    </>
  );
}
