"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanReviewCard = void 0;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var agent_1 = require("@/ipc/agent");
var agentStore_1 = require("@/stores/agentStore");
var MarkdownBody_1 = require("@/components/common/MarkdownBody");
function shortenPlanPath(filePath) {
    var parts = filePath.split("/");
    if (parts.length <= 2)
        return filePath;
    return ".../" + parts.slice(-2).join("/");
}
exports.PlanReviewCard = (0, react_1.memo)(function PlanReviewCard(_a) {
    var planFilePath = _a.planFilePath, planContent = _a.planContent, sessionId = _a.sessionId, underlyingMode = _a.underlyingMode;
    var updateTabMeta = (0, agentStore_1.useAgentStore)(function (s) { return s.updateTabMeta; });
    var updateTabState = (0, agentStore_1.useAgentStore)(function (s) { return s.updateTabState; });
    var clearPlanReview = (0, agentStore_1.useAgentStore)(function (s) { return s.clearPlanReview; });
    var appendMessage = (0, agentStore_1.useAgentStore)(function (s) { return s.appendMessage; });
    var createPendingAssistant = (0, agentStore_1.useAgentStore)(function (s) { return s.createPendingAssistant; });
    var handleApprove = (0, react_1.useCallback)(function () {
        clearPlanReview(sessionId);
        updateTabMeta(sessionId, { planMode: false });
        updateTabState(sessionId, "thinking");
        // Switch permission mode back to the underlying mode and send execution prompt
        void agent_1.agentIpc.updatePermissionMode(sessionId, underlyingMode).catch(function (err) {
            console.error("Failed to update permission mode:", err);
        });
        var now = Date.now();
        appendMessage(sessionId, {
            id: "user-".concat(now),
            type: "user",
            content: "Plan approved. Execute it.",
            timestamp: now,
            collapsed: false,
        });
        createPendingAssistant(sessionId);
        void agent_1.agentIpc.sendMessage(sessionId, "Plan approved. Execute it.").catch(function (err) {
            console.error("Failed to send plan approval:", err);
        });
    }, [sessionId, underlyingMode, clearPlanReview, updateTabMeta, updateTabState, appendMessage, createPendingAssistant]);
    var handleEdit = (0, react_1.useCallback)(function () {
        clearPlanReview(sessionId);
        updateTabState(sessionId, "completed");
        // User can now type feedback in the regular input box
    }, [sessionId, clearPlanReview, updateTabState]);
    var handleCancel = (0, react_1.useCallback)(function () {
        clearPlanReview(sessionId);
        updateTabMeta(sessionId, { planMode: false });
        updateTabState(sessionId, "completed");
        void agent_1.agentIpc.updatePermissionMode(sessionId, underlyingMode).catch(function (err) {
            console.error("Failed to update permission mode:", err);
        });
    }, [sessionId, underlyingMode, clearPlanReview, updateTabMeta, updateTabState]);
    return (<div className="rounded-lg border border-blue-500/40 bg-blue-500/5 px-4 py-3">
      <div className="flex items-start gap-3">
        <lucide_react_1.ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-blue-400"/>
        <div className="flex-1 space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Plan Ready for Review</p>
            {planFilePath && (<p className="text-xs text-muted-foreground">
                {shortenPlanPath(planFilePath)}
              </p>)}
          </div>

          {planContent && (<div className="max-h-64 overflow-auto rounded-md border border-blue-500/20 bg-background/80 p-3">
              <MarkdownBody_1.MarkdownBody content={planContent} className="text-sm"/>
            </div>)}

          <div className="flex gap-2">
            <button type="button" onClick={handleCancel} className="flex items-center gap-1.5 rounded-md border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
              <lucide_react_1.X className="h-3 w-3"/>
              Cancel
            </button>
            <button type="button" onClick={handleEdit} className="flex items-center gap-1.5 rounded-md border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
              <lucide_react_1.Pencil className="h-3 w-3"/>
              Edit Plan
            </button>
            <button type="button" onClick={handleApprove} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              <lucide_react_1.Check className="h-3 w-3"/>
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>);
});
