"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalTab = TerminalTab;
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var agentStore_1 = require("@/stores/agentStore");
function TerminalTab(_a) {
    var tab = _a.tab, isActive = _a.isActive, onSelect = _a.onSelect, onClose = _a.onClose;
    var agentState = (0, agentStore_1.useAgentStore)(function (s) {
        var _a;
        return tab.type === "chat" && tab.sessionId
            ? (_a = s.tabs.find(function (entry) { return entry.sessionId === tab.sessionId; })) === null || _a === void 0 ? void 0 : _a.state
            : undefined;
    });
    var isRunning = agentState === "thinking" ||
        agentState === "executing" ||
        agentState === "awaiting_approval";
    return (<button onClick={onSelect} className={(0, utils_1.cn)("group flex h-8 items-center gap-1.5 border-b-2 px-3 text-xs transition-colors", isActive
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground")}>
      {tab.status === "pre-session" ? (<lucide_react_1.Sparkles className="h-3 w-3 shrink-0"/>) : tab.type === "chat" ? (<lucide_react_1.MessageSquare className="h-3 w-3 shrink-0"/>) : (<lucide_react_1.Terminal className="h-3 w-3 shrink-0"/>)}
      <span className="truncate max-w-[120px]">{tab.label}</span>
      {isRunning && (<lucide_react_1.Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground"/>)}
      <span role="button" onClick={function (e) { e.stopPropagation(); onClose(); }} className="ml-1 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-accent">
        <lucide_react_1.X className="h-3 w-3"/>
      </span>
    </button>);
}
