import { useState, useCallback } from "react";
import { FolderOpen, Download, Loader2, SkipForward, AlertCircle } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { gitIpc } from "@/ipc/git";
import { useSetLocalPath, useCloneRepo } from "@/queries/useGitMutations";
import type { Repository } from "@forge/shared";

function parseGitHubRemote(url: string): { owner: string; name: string } | null {
  const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  return match ? { owner: match[1], name: match[2] } : null;
}

interface RepoSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repos: Repository[];
}

export function RepoSetupDialog({ open: isOpen, onOpenChange, repos }: RepoSetupDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setLocalPath = useSetLocalPath();
  const cloneRepo = useCloneRepo();

  const currentRepo = repos[currentIndex];
  const total = repos.length;

  function advance() {
    setError(null);
    if (currentIndex + 1 >= total) {
      onOpenChange(false);
      setCurrentIndex(0);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      setCurrentIndex(0);
      setError(null);
    }
    onOpenChange(open);
  }

  const handleSelectLocal = useCallback(async () => {
    if (!currentRepo) return;
    setError(null);

    const selected = await open({
      directory: true,
      title: `Select local clone of ${currentRepo.fullName}`,
    });
    if (!selected) return;

    setBusy(true);
    try {
      const remoteUrl = await gitIpc.getRemoteUrl(selected);
      if (remoteUrl) {
        const parsed = parseGitHubRemote(remoteUrl);
        if (parsed) {
          const matches =
            parsed.owner.toLowerCase() === currentRepo.owner.toLowerCase() &&
            parsed.name.toLowerCase() === currentRepo.name.toLowerCase();
          if (!matches) {
            setError(
              `That folder is a clone of ${parsed.owner}/${parsed.name}, not ${currentRepo.fullName}. Please select the correct folder.`
            );
            setBusy(false);
            return;
          }
        }
      }

      await setLocalPath.mutateAsync({ repoId: currentRepo.id, localPath: selected });
      advance();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [currentRepo, setLocalPath]);

  const handleClone = useCallback(async () => {
    if (!currentRepo) return;
    setError(null);

    const dest = await open({
      directory: true,
      title: `Choose where to clone ${currentRepo.fullName}`,
    });
    if (!dest) return;

    const clonePath = `${dest}/${currentRepo.name}`;
    const url = `https://github.com/${currentRepo.fullName}.git`;

    setBusy(true);
    try {
      await cloneRepo.mutateAsync({
        url,
        localPath: clonePath,
        repoId: currentRepo.id,
      });
      advance();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [currentRepo, cloneRepo]);

  if (!currentRepo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Set Up Repository</DialogTitle>
          <DialogDescription>
            {total > 1
              ? `Repository ${currentIndex + 1} of ${total} — Where is this repo on your machine?`
              : "Where is this repo on your machine?"}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border px-3 py-2.5">
          <p className="text-sm font-medium">{currentRepo.fullName}</p>
          {currentRepo.isPrivate && (
            <p className="text-xs text-muted-foreground">Private</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="justify-start gap-2 h-auto py-3"
            onClick={handleSelectLocal}
            disabled={busy}
          >
            {busy && setLocalPath.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <FolderOpen className="h-4 w-4 shrink-0" />
            )}
            <div className="text-left">
              <p className="text-sm font-medium">I already have it cloned</p>
              <p className="text-xs text-muted-foreground">Select the local folder</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="justify-start gap-2 h-auto py-3"
            onClick={handleClone}
            disabled={busy}
          >
            {busy && cloneRepo.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <Download className="h-4 w-4 shrink-0" />
            )}
            <div className="text-left">
              <p className="text-sm font-medium">Clone from GitHub</p>
              <p className="text-xs text-muted-foreground">Download a fresh copy</p>
            </div>
          </Button>

          <Button
            variant="ghost"
            className="justify-start gap-2 text-muted-foreground"
            onClick={advance}
            disabled={busy}
          >
            <SkipForward className="h-4 w-4 shrink-0" />
            Skip for now
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
