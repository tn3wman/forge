import { Loader2, X, Terminal, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TerminalTab as TerminalTabType } from "@/stores/terminalStore";
import { useAgentStore } from "@/stores/agentStore";

interface TerminalTabProps {
  tab: TerminalTabType;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}

export function TerminalTab({ tab, isActive, onSelect, onClose }: TerminalTabProps) {
  const agentState = useAgentStore((s) =>
    tab.type === "chat" && tab.sessionId
      ? s.tabs.find((entry) => entry.sessionId === tab.sessionId)?.state
      : undefined,
  );
  const isRunning =
    agentState === "thinking" ||
    agentState === "executing" ||
    agentState === "awaiting_approval";

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group flex h-8 items-center gap-1.5 border-b-2 px-3 text-xs transition-colors",
        isActive
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {tab.status === "pre-session" ? (
        <Sparkles className="h-3 w-3 shrink-0" />
      ) : tab.type === "chat" ? (
        <MessageSquare className="h-3 w-3 shrink-0" />
      ) : (
        <Terminal className="h-3 w-3 shrink-0" />
      )}
      <span className="truncate max-w-[120px]">{tab.label}</span>
      {isRunning && (
        <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
      )}
      <span
        role="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="ml-1 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-accent"
      >
        <X className="h-3 w-3" />
      </span>
    </button>
  );
}
