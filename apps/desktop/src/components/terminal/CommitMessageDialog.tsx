import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { useGenerateCommitMessage } from "@/hooks/useGenerateCommitMessage";

interface CommitMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (message: string) => void;
  title: string;
  isLoading: boolean;
  error: string | null;
  localPath?: string;
}

export function CommitMessageDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  isLoading,
  error,
  localPath,
}: CommitMessageDialogProps) {
  const [message, setMessage] = useState("");
  const generateMutation = useGenerateCommitMessage();

  const handleGenerate = useCallback(() => {
    if (!localPath || generateMutation.isPending) return;
    generateMutation.mutate(localPath, {
      onSuccess: (data) => {
        const msg = data.body ? `${data.title}\n\n${data.body}` : data.title;
        setMessage(msg);
      },
    });
  }, [localPath, generateMutation]);

  const handleSubmit = useCallback(() => {
    if (message.trim()) {
      onConfirm(message.trim());
    }
  }, [message, onConfirm]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && message.trim() && !isLoading) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, message, isLoading],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setMessage("");
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <textarea
          autoFocus
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your changes..."
          className="min-h-[80px] w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {(error || generateMutation.isError) && (
          <p className="text-xs text-destructive">
            {error || (generateMutation.error instanceof Error
              ? generateMutation.error.message
              : String(generateMutation.error))}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">⌘+Enter to submit</span>
            {localPath && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Generate commit message with AI"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
          <Button
            size="sm"
            disabled={!message.trim() || isLoading}
            onClick={handleSubmit}
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {title}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
