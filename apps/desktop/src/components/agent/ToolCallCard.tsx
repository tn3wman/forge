import { memo } from "react";
import { ChevronRight, ChevronDown, Wrench, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentMessage } from "@/stores/agentStore";

interface ToolCallCardProps {
  toolUse: AgentMessage;
  toolResult?: AgentMessage;
  collapsed: boolean;
  onToggle: () => void;
}

export const ToolCallCard = memo(function ToolCallCard({
  toolUse,
  toolResult,
  collapsed,
  onToggle,
}: ToolCallCardProps) {
  const pending = !toolResult;
  const isError = toolResult?.isError;

  return (
    <div className="rounded-lg border border-border bg-muted/30">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="font-mono text-xs">{toolUse.toolName ?? "tool"}</span>
        <span className="ml-auto">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : isError ? (
            <X className="h-4 w-4 text-red-500" />
          ) : (
            <Check className="h-4 w-4 text-green-500" />
          )}
        </span>
      </button>

      {!collapsed && (
        <div className="border-t border-border px-3 py-2 space-y-2">
          {toolUse.toolInput && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Input</p>
              <pre className="max-h-48 overflow-auto rounded bg-background p-2 text-xs">
                <code>{JSON.stringify(toolUse.toolInput, null, 2)}</code>
              </pre>
            </div>
          )}
          {toolResult && (
            <div>
              <p className={cn("text-xs font-medium mb-1", isError ? "text-red-400" : "text-muted-foreground")}>
                Output
              </p>
              <pre className="max-h-48 overflow-auto rounded bg-background p-2 text-xs">
                <code>{toolResult.content}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
