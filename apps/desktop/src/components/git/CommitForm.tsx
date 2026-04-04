import { useState, useCallback, useRef, useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCommit, useAmend } from "@/queries/useGitMutations";
import { useGitLog } from "@/queries/useGitLog";
import { useGenerateCommitMessage } from "@/hooks/useGenerateCommitMessage";

interface CommitFormProps {
  localPath: string;
  stagedCount: number;
}

export function CommitForm({ localPath, stagedCount }: CommitFormProps) {
  const [message, setMessage] = useState("");
  const [amend, setAmend] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const commitMutation = useCommit();
  const amendMutation = useAmend();
  const generateMutation = useGenerateCommitMessage();
  const { data: logPages } = useGitLog(localPath);

  const lastCommitMessage = logPages?.pages?.[0]?.[0]?.commit?.message ?? "";

  // Load last commit message when amend is checked
  useEffect(() => {
    if (amend && lastCommitMessage) {
      setMessage(lastCommitMessage);
    }
  }, [amend, lastCommitMessage]);

  const firstLine = message.split("\n")[0] ?? "";
  const firstLineOverflow = firstLine.length > 72;

  const canCommit = stagedCount > 0 && message.trim().length > 0;
  const isPending = commitMutation.isPending || amendMutation.isPending;

  const handleSubmit = useCallback(() => {
    if (!canCommit || isPending) return;
    const mutation = amend ? amendMutation : commitMutation;
    mutation.mutate(
      { path: localPath, message: message.trim() },
      {
        onSuccess: () => {
          setMessage("");
          setAmend(false);
        },
      },
    );
  }, [canCommit, isPending, amend, amendMutation, commitMutation, localPath, message]);

  const handleGenerate = useCallback(() => {
    if (stagedCount === 0 || generateMutation.isPending) return;
    generateMutation.mutate(localPath, {
      onSuccess: (data) => {
        const msg = data.body ? `${data.title}\n\n${data.body}` : data.title;
        setMessage(msg);
      },
    });
  }, [stagedCount, generateMutation, localPath]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className="border-t border-border p-3 space-y-2">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Commit message..."
        rows={3}
        className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />

      <div className="flex items-center justify-between text-xs">
        <span
          className={cn(
            "tabular-nums text-muted-foreground",
            firstLineOverflow && "text-yellow-400",
          )}
        >
          {firstLine.length}/72
        </span>
        {generateMutation.isError && (
          <span className="text-destructive truncate ml-2">
            {generateMutation.error instanceof Error
              ? generateMutation.error.message
              : "Failed to generate message"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={amend}
            onChange={(e) => setAmend(e.target.checked)}
            className="rounded border-border"
          />
          Amend
        </label>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          disabled={stagedCount === 0 || generateMutation.isPending}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          title="Generate commit message with AI"
        >
          {generateMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
        </Button>

        <div className="flex-1" />

        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!canCommit || isPending}
          className="text-xs"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : null}
          {amend ? "Amend" : "Commit"} ({stagedCount})
        </Button>
      </div>
    </div>
  );
}
