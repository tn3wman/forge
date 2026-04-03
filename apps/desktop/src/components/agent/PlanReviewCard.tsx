import { memo, useCallback } from "react";
import { ClipboardList, Check, Pencil, X } from "lucide-react";
import { agentIpc } from "@/ipc/agent";
import { useAgentStore } from "@/stores/agentStore";
import { MarkdownBody } from "@/components/common/MarkdownBody";
import type { AgentChatMode } from "@forge/shared";

interface PlanReviewCardProps {
  planFilePath: string;
  planContent: string;
  sessionId: string;
  underlyingMode: AgentChatMode;
}

function shortenPlanPath(filePath: string): string {
  const parts = filePath.split("/");
  if (parts.length <= 2) return filePath;
  return ".../" + parts.slice(-2).join("/");
}

export const PlanReviewCard = memo(function PlanReviewCard({
  planFilePath,
  planContent,
  sessionId,
  underlyingMode,
}: PlanReviewCardProps) {
  const updateTabMeta = useAgentStore((s) => s.updateTabMeta);
  const updateTabState = useAgentStore((s) => s.updateTabState);
  const clearPlanReview = useAgentStore((s) => s.clearPlanReview);
  const appendMessage = useAgentStore((s) => s.appendMessage);
  const createPendingAssistant = useAgentStore((s) => s.createPendingAssistant);

  const handleApprove = useCallback(() => {
    clearPlanReview(sessionId);
    updateTabMeta(sessionId, { planMode: false });
    updateTabState(sessionId, "thinking");
    // Switch permission mode back to the underlying mode and send execution prompt
    void agentIpc.updatePermissionMode(sessionId, underlyingMode).catch((err) => {
      console.error("Failed to update permission mode:", err);
    });
    const now = Date.now();
    appendMessage(sessionId, {
      id: `user-${now}`,
      type: "user",
      content: "Plan approved. Execute it.",
      timestamp: now,
      collapsed: false,
    });
    createPendingAssistant(sessionId);
    void agentIpc.sendMessage(sessionId, "Plan approved. Execute it.").catch((err) => {
      console.error("Failed to send plan approval:", err);
    });
  }, [sessionId, underlyingMode, clearPlanReview, updateTabMeta, updateTabState, appendMessage, createPendingAssistant]);

  const handleEdit = useCallback(() => {
    clearPlanReview(sessionId);
    updateTabState(sessionId, "completed");
    // User can now type feedback in the regular input box
  }, [sessionId, clearPlanReview, updateTabState]);

  const handleCancel = useCallback(() => {
    clearPlanReview(sessionId);
    updateTabMeta(sessionId, { planMode: false });
    updateTabState(sessionId, "completed");
    void agentIpc.updatePermissionMode(sessionId, underlyingMode).catch((err) => {
      console.error("Failed to update permission mode:", err);
    });
  }, [sessionId, underlyingMode, clearPlanReview, updateTabMeta, updateTabState]);

  return (
    <div className="rounded-lg border border-blue-500/40 bg-blue-500/5 px-4 py-3">
      <div className="flex items-start gap-3">
        <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
        <div className="flex-1 space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Plan Ready for Review</p>
            {planFilePath && (
              <p className="text-xs text-muted-foreground">
                {shortenPlanPath(planFilePath)}
              </p>
            )}
          </div>

          {planContent && (
            <div className="max-h-64 overflow-auto rounded-md border border-blue-500/20 bg-background/80 p-3">
              <MarkdownBody
                content={planContent}
                className="text-sm"
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-1.5 rounded-md border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEdit}
              className="flex items-center gap-1.5 rounded-md border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Pencil className="h-3 w-3" />
              Edit Plan
            </button>
            <button
              type="button"
              onClick={handleApprove}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Check className="h-3 w-3" />
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
