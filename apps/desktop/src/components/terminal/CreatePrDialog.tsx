import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useCurrentBranch } from "@/queries/useGitBranches";
import { useCreatePr } from "@/queries/useMutations";
import { useAuthStore } from "@/stores/authStore";
import { gitIpc } from "@/ipc/git";

interface CreatePrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workingDirectory: string;
}

function parseOwnerRepo(remoteUrl: string): { owner: string; repo: string } | null {
  const match = remoteUrl.match(/[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

export function CreatePrDialog({ open, onOpenChange, workingDirectory }: CreatePrDialogProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: currentBranch } = useCurrentBranch(workingDirectory);
  const createPr = useCreatePr();

  const [ownerRepo, setOwnerRepo] = useState<{ owner: string; repo: string } | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [base, setBase] = useState("main");
  const [draft, setDraft] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset form state when dialog opens
  useEffect(() => {
    if (!open) return;
    setBody("");
    setBase("main");
    setDraft(true);
    setError(null);
    gitIpc.getRemoteUrl(workingDirectory).then((url) => {
      if (url) {
        const parsed = parseOwnerRepo(url);
        setOwnerRepo(parsed);
        if (!parsed) setError("Could not parse remote URL: " + url);
      } else {
        setError("No remote configured for this repository");
      }
    }).catch((e) => {
      setError(e instanceof Error ? e.message : String(e));
    });
  }, [open, workingDirectory]);

  useEffect(() => {
    if (open && currentBranch) {
      setTitle(currentBranch.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase()));
    }
  }, [open, currentBranch]);

  const canSubmit = !!ownerRepo && isAuthenticated && !!title.trim() && !!currentBranch && currentBranch !== base;

  const handleSubmit = async () => {
    if (!canSubmit || !ownerRepo) return;
    setError(null);
    try {
      const result = await createPr.mutateAsync({
        owner: ownerRepo.owner,
        repo: ownerRepo.repo,
        title: title.trim(),
        body: body.trim(),
        head: currentBranch!,
        base,
        draft,
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Pull Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Optional..."
              className="min-h-[60px] w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Base branch</label>
              <input
                value={base}
                onChange={(e) => setBase(e.target.value)}
                className="w-full rounded-md border bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Head branch</label>
              <input
                value={currentBranch ?? ""}
                disabled
                className="w-full rounded-md border bg-transparent px-3 py-1.5 text-sm text-muted-foreground"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft}
              onChange={(e) => setDraft(e.target.checked)}
              className="rounded"
            />
            Create as draft
          </label>
          {currentBranch === base && (
            <p className="text-xs text-yellow-500">Cannot create PR: head and base branches are the same</p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button size="sm" disabled={!canSubmit || createPr.isPending} onClick={handleSubmit}>
              {createPr.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create PR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
