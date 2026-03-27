import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateWorkspace } from "@/queries/useWorkspaces";
import type { Workspace } from "@forge/shared";

interface RenameWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Workspace | null;
}

export function RenameWorkspaceDialog({ open, onOpenChange, workspace }: RenameWorkspaceDialogProps) {
  const [name, setName] = useState("");
  const updateWorkspace = useUpdateWorkspace();

  useEffect(() => {
    if (open && workspace) {
      setName(workspace.name);
    }
  }, [open, workspace]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !name.trim() || name.trim() === workspace.name) return;

    await updateWorkspace.mutateAsync({ id: workspace.id, request: { name: name.trim() } });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Rename Workspace</DialogTitle>
          <DialogDescription>
            Enter a new name for this workspace.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || name.trim() === workspace?.name || updateWorkspace.isPending}
            >
              {updateWorkspace.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
