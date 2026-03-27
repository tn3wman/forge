import { useState, useCallback, useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlashCommandMenu } from "./SlashCommandMenu";
import type { AgentState } from "@forge/shared";
import type { AgentChatMode, SlashCommandInfo } from "@forge/shared";

interface ChatInputProps {
  onSend: (message: string) => void;
  onAbort: () => void;
  agentState: AgentState;
  disabled?: boolean;
  onModeChange?: (mode: AgentChatMode) => void;
  onClear?: () => void;
  onFocusChange?: (focused: boolean) => void;
  slashCommands?: SlashCommandInfo[];
}

const MODE_COMMANDS: Record<string, AgentChatMode> = {
  plan: "plan",
  default: "default",
  yolo: "bypassPermissions",
  auto: "auto",
};

export function ChatInput({
  onSend,
  onAbort,
  agentState,
  disabled,
  onModeChange,
  onClear,
  onFocusChange,
  slashCommands = [],
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [slashMenuDismissed, setSlashMenuDismissed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isRunning = agentState === "thinking" || agentState === "executing";

  const showSlashMenu = text.startsWith("/") && !text.includes(" ") && !slashMenuDismissed;
  const slashFilter = text.slice(1);

  // Reset dismissed state when text changes away from slash
  useEffect(() => {
    if (!text.startsWith("/")) {
      setSlashMenuDismissed(false);
    }
  }, [text]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  const showConfirmationMsg = useCallback((msg: string) => {
    setConfirmation(msg);
    setTimeout(() => setConfirmation(null), 1000);
  }, []);

  const handleCommandSelect = useCallback(
    (cmd: SlashCommandInfo) => {
      if (cmd.category === "local") {
        switch (cmd.name) {
          case "clear":
            onClear?.();
            showConfirmationMsg("Messages cleared");
            break;
          case "abort":
            onAbort();
            break;
          default: {
            const mode = MODE_COMMANDS[cmd.name];
            if (mode) {
              onModeChange?.(mode);
              showConfirmationMsg(`Mode changed to ${mode}`);
            }
          }
        }
      } else {
        onSend(`/${cmd.name}`);
      }
      setText("");
    },
    [onClear, onAbort, onModeChange, onSend, showConfirmationMsg],
  );

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const lower = trimmed.toLowerCase();

    if (lower === "/clear") {
      onClear?.();
      setText("");
      showConfirmationMsg("Messages cleared");
      return;
    }

    if (lower === "/abort") {
      onAbort();
      setText("");
      return;
    }

    const modeCmd = MODE_COMMANDS[lower.slice(1)];
    if (lower.startsWith("/") && modeCmd) {
      onModeChange?.(modeCmd);
      setText("");
      showConfirmationMsg(`Mode changed to ${modeCmd}`);
      return;
    }

    // Normal message (including unknown slash commands)
    onSend(trimmed);
    setText("");
  }, [text, onSend, onAbort, onModeChange, onClear, showConfirmationMsg]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSlashMenu) {
          e.preventDefault();
          setSlashMenuDismissed(true);
          return;
        }
        if (isRunning) {
          e.preventDefault();
          onAbort();
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, isRunning, onAbort, showSlashMenu],
  );

  return (
    <div className="relative flex items-end gap-2 border-t border-border bg-background px-3 py-2">
      {confirmation && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground animate-in fade-in zoom-in duration-150">
          {confirmation}
        </div>
      )}
      <SlashCommandMenu
        filter={slashFilter}
        commands={slashCommands}
        onSelect={handleCommandSelect}
        onDismiss={() => setSlashMenuDismissed(true)}
        visible={showSlashMenu}
      />
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
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
