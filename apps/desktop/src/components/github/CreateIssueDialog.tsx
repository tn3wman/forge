import { useState, useCallback, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateIssue } from "@/queries/useMutations";
import { useRepositories } from "@/queries/useRepositories";
import { useWorkspaceStore } from "@/stores/workspaceStore";

interface CreateIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repoFullName?: string | null;
}

export function CreateIssueDialog({ open, onOpenChange, repoFullName }: CreateIssueDialogProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<string | null>(repoFullName ?? null);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const { activeWorkspaceId } = useWorkspaceStore();
  const { data: repos } = useRepositories(activeWorkspaceId);
  const createIssue = useCreateIssue();

  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setTitle("");
      setBody("");
      setError(null);
      setSelectedRepo(repoFullName ?? null);
    }
  }, [open, repoFullName]);

  useEffect(() => {
    if (!selectedRepo && repos?.length === 1) {
      setSelectedRepo(repos[0].fullName);
    }
  }, [repos, selectedRepo]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!selectedRepo) {
      setError("Please select a repository");
      return;
    }

    setError(null);
    const [owner, repo] = selectedRepo.split("/");

    try {
      const result = await createIssue.mutateAsync({
        owner,
        repo,
        title: title.trim(),
        body: body.trim(),
        labels: [],
      });
      onOpenChange(false);
      const { navigateToIssue } = useWorkspaceStore.getState();
      navigateToIssue(selectedRepo, result.number);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [title, body, selectedRepo, createIssue, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>New Issue</DialogTitle>
          <DialogDescription>
            Create a new GitHub issue.{" "}
            <span className="text-muted-foreground/60">Cmd+Enter to submit</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-2">
          {repos && repos.length > 1 && (
            <select
              value={selectedRepo ?? ""}
              onChange={(e) => setSelectedRepo(e.target.value || null)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select repository...</option>
              {repos.map((r) => (
                <option key={r.id} value={r.fullName}>
                  {r.fullName}
                </option>
              ))}
            </select>
          )}

          {repos && repos.length === 1 && selectedRepo && (
            <div className="text-xs text-muted-foreground">
              {selectedRepo}
            </div>
          )}

          <Input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title"
            className="h-8 text-sm"
          />

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe the issue... (Markdown supported)"
            rows={6}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[100px]"
          />

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={createIssue.isPending || !title.trim() || !selectedRepo}
            >
              {createIssue.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Creating...
                </>
              ) : (
                "Create Issue"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
