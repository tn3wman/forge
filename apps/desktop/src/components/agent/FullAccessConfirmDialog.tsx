import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface FullAccessConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function FullAccessConfirmDialog({
  open,
  onConfirm,
  onCancel,
}: FullAccessConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <DialogTitle>Enable Full Access?</DialogTitle>
          </div>
          <DialogDescription className="pt-2 text-sm leading-relaxed">
            Full Access mode allows the agent to read, write, and execute
            commands on your system without asking for permission. Only use
            this if you trust the agent with unrestricted access to your
            machine.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Enable Full Access
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
