import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteWorkspace, useWorkspaces } from "@/queries/useWorkspaces";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import type { Workspace } from "@forge/shared";

interface DeleteWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Workspace | null;
}

export function DeleteWorkspaceDialog({ open, onOpenChange, workspace }: DeleteWorkspaceDialogProps) {
  const deleteWorkspace = useDeleteWorkspace();
  const { data: workspaces } = useWorkspaces();
  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspaceStore();

  async function handleDelete() {
    if (!workspace) return;

    const isActive = activeWorkspaceId === workspace.id;
    await deleteWorkspace.mutateAsync(workspace.id);

    if (isActive) {
      const remaining = workspaces?.filter((w) => w.id !== workspace.id) ?? [];
      setActiveWorkspaceId(remaining.length > 0 ? remaining[0].id : null);
    }

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Delete Workspace</DialogTitle>
          <DialogDescription>
            This will permanently delete <strong>{workspace?.name}</strong> and unlink all its
            repositories. Your local files will not be affected.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteWorkspace.isPending}
          >
            {deleteWorkspace.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
