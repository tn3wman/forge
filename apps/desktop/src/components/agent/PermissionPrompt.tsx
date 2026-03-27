import { memo, useCallback } from "react";
import { ShieldAlert } from "lucide-react";
import { agentIpc } from "@/ipc/agent";
import type { AgentMessage } from "@/stores/agentStore";

interface PermissionPromptProps {
  message: AgentMessage;
  sessionId: string;
}

export const PermissionPrompt = memo(function PermissionPrompt({
  message,
  sessionId,
}: PermissionPromptProps) {
  const toolUseId = message.toolUseId;

  const handleRespond = useCallback(
    (allow: boolean) => {
      if (!toolUseId) return;
      agentIpc.respondPermission(sessionId, toolUseId, allow);
    },
    [sessionId, toolUseId],
  );

  return (
    <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 px-4 py-3">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
        <div className="flex-1 space-y-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {message.toolName ? `Approve ${message.toolName}` : message.content}
            </p>
            {message.detail && (
              <p className="text-xs text-muted-foreground">{message.detail}</p>
            )}
          </div>
          {message.toolInput && (
            <pre className="max-h-40 overflow-auto rounded-md border border-yellow-500/20 bg-background/80 p-2 text-xs text-muted-foreground">
              <code>{JSON.stringify(message.toolInput, null, 2)}</code>
            </pre>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleRespond(false)}
              className="rounded-md border border-border bg-transparent px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              Deny
            </button>
            <button
              type="button"
              onClick={() => handleRespond(true)}
              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Allow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
