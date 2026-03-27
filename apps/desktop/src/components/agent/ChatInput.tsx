import { useState, useCallback, useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentState } from "@forge/shared";

interface ChatInputProps {
  onSend: (message: string) => void;
  onAbort: () => void;
  agentState: AgentState;
  disabled?: boolean;
}

export function ChatInput({ onSend, onAbort, agentState, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isRunning = agentState === "thinking" || agentState === "executing";

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  }, [text, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
      if (e.key === "Escape" && isRunning) {
        e.preventDefault();
        onAbort();
      }
    },
    [handleSend, isRunning, onAbort],
  );

  return (
    <div className="flex items-end gap-2 border-t border-border bg-background px-3 py-2">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={disabled}
        placeholder={isRunning ? "Agent is working..." : "Message... (\u2318+Enter to send)"}
        className={cn(
          "flex-1 resize-none rounded-md border border-border bg-muted/50 px-3 py-2 text-sm",
          "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      />
      {isRunning ? (
        <button
          type="button"
          onClick={onAbort}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-700"
        >
          <Square className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            text.trim()
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
