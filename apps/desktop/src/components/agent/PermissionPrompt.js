"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionPrompt = void 0;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var agent_1 = require("@/ipc/agent");
var ToolInputSummary_1 = require("./tool-renderers/ToolInputSummary");
exports.PermissionPrompt = (0, react_1.memo)(function PermissionPrompt(_a) {
    var _b;
    var message = _a.message, sessionId = _a.sessionId;
    var toolUseId = message.toolUseId;
    var handleRespond = (0, react_1.useCallback)(function (allow) {
        if (!toolUseId)
            return;
        agent_1.agentIpc.respondPermission(sessionId, toolUseId, allow);
    }, [sessionId, toolUseId]);
    return (<div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 px-4 py-3">
      <div className="flex items-start gap-3">
        <lucide_react_1.ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500"/>
        <div className="flex-1 space-y-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {message.toolName ? "Approve ".concat(message.toolName) : message.content}
            </p>
            {message.detail && (<p className="text-xs text-muted-foreground">{message.detail}</p>)}
          </div>
          {message.toolInput && (<div className="max-h-40 overflow-auto rounded-md border border-yellow-500/20 bg-background/80 p-2">
              <ToolInputSummary_1.ToolInputSummary toolName={(_b = message.toolName) !== null && _b !== void 0 ? _b : "tool"} toolInput={message.toolInput}/>
            </div>)}
          <div className="flex gap-2">
            <button type="button" onClick={function () { return handleRespond(false); }} className="rounded-md border border-border bg-transparent px-3 py-1 text-xs font-medium text-foreground hover:bg-muted">
              Deny
            </button>
            <button type="button" onClick={function () { return handleRespond(true); }} className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              Allow
            </button>
          </div>
        </div>
      </div>
    </div>);
});
