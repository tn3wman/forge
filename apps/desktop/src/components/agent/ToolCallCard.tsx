import { memo } from "react";
import { ChevronRight, ChevronDown, Wrench, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentMessage } from "@/stores/agentStore";
import { ToolInputSummary } from "./tool-renderers/ToolInputSummary";
import { ToolOutputRenderer } from "./tool-renderers/ToolOutputRenderer";

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
  const pending =
    toolUse.streamState !== "completed" &&
    toolUse.streamState !== "error" &&
    (!toolResult ||
      toolResult.streamState === "pending" ||
      toolResult.streamState === "streaming");
  const isError = toolResult?.isError || toolUse.streamState === "error";

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
          {(toolUse.toolInput || toolUse.toolInputText) && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Input</p>
              <ToolInputSummary
                toolName={toolUse.toolName ?? "tool"}
                toolInput={toolUse.toolInput}
                toolInputText={toolUse.toolInputText}
              />
            </div>
          )}
          {toolUse.toolStatus && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
              <p className="rounded bg-background px-2 py-1 text-xs text-muted-foreground">
                {toolUse.toolStatus}
              </p>
            </div>
          )}
          {toolResult && (
            <div>
              <p className={cn("text-xs font-medium mb-1", isError ? "text-red-400" : "text-muted-foreground")}>
                Output
              </p>
              {toolResult.content ? (
                <ToolOutputRenderer
                  content={toolResult.content}
                  toolName={toolUse.toolName}
                  toolInput={toolUse.toolInput}
                  isStreaming={toolResult.streamState === "streaming"}
                  isError={isError}
                />
              ) : (
                <p className="rounded bg-background px-2 py-1 text-xs text-muted-foreground">
                  {pending ? "Waiting for tool output..." : "Tool completed without output."}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
