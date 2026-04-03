"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Terminals = Terminals;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var lucide_react_2 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var terminalStore_1 = require("@/stores/terminalStore");
var agentStore_1 = require("@/stores/agentStore");
var TerminalTab_1 = require("@/components/terminal/TerminalTab");
var TerminalView_1 = require("@/components/terminal/TerminalView");
var ChatView_1 = require("@/components/agent/ChatView");
var ClaudeChatView_1 = require("@/components/agent/ClaudeChatView");
var PreSessionView_1 = require("@/components/agent/PreSessionView");
var workspaceStore_1 = require("@/stores/workspaceStore");
var terminal_1 = require("@/ipc/terminal");
var agent_1 = require("@/ipc/agent");
var CommitPushButton_1 = require("@/components/terminal/CommitPushButton");
var ChatErrorBoundary = /** @class */ (function (_super) {
    __extends(ChatErrorBoundary, _super);
    function ChatErrorBoundary() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.state = { error: null };
        return _this;
    }
    ChatErrorBoundary.getDerivedStateFromError = function (error) {
        return { error: error };
    };
    ChatErrorBoundary.prototype.render = function () {
        var _this = this;
        if (this.state.error) {
            return (<div className="flex h-full flex-col items-center justify-center gap-3 p-4">
          <lucide_react_1.AlertTriangle className="h-8 w-8 text-yellow-500"/>
          <p className="text-sm font-medium text-foreground">Chat session crashed</p>
          <p className="max-w-sm text-center text-xs text-muted-foreground">
            {this.state.error.message}
          </p>
          <button onClick={function () { return _this.setState({ error: null }); }} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <lucide_react_1.RotateCcw className="h-3.5 w-3.5"/>
            Retry
          </button>
        </div>);
        }
        return this.props.children;
    };
    return ChatErrorBoundary;
}(react_1.Component));
var LAYOUT_OPTIONS = [
    { mode: "tabs", icon: lucide_react_1.Layers, label: "Tabs" },
    { mode: "grid", icon: lucide_react_1.LayoutGrid, label: "Grid" },
    { mode: "horizontal-scroll", icon: lucide_react_1.Columns, label: "Columns" },
];
function computeGridCols(count) {
    if (count <= 1)
        return 1;
    if (count <= 2)
        return 2;
    if (count <= 4)
        return 2;
    if (count <= 6)
        return 3;
    return Math.ceil(Math.sqrt(count));
}
function Terminals(_a) {
    var onNewTerminal = _a.onNewTerminal;
    var _b = (0, terminalStore_1.useTerminalStore)(), allTabs = _b.tabs, activeTabId = _b.activeTabId, layoutMode = _b.layoutMode, setLayoutMode = _b.setLayoutMode, setActiveTab = _b.setActiveTab, removeTab = _b.removeTab;
    var agentTabs = (0, agentStore_1.useAgentStore)(function (s) { return s.tabs; });
    var activeWorkspaceId = (0, workspaceStore_1.useWorkspaceStore)(function (s) { return s.activeWorkspaceId; });
    var tabs = allTabs.filter(function (t) { return t.workspaceId === activeWorkspaceId; });
    // Auto-select first workspace tab when activeTabId is not in filtered set
    (0, react_1.useEffect)(function () {
        if (tabs.length > 0 && !tabs.some(function (t) { return t.tabId === activeTabId; })) {
            setActiveTab(tabs[0].tabId);
        }
    }, [tabs, activeTabId, setActiveTab]);
    var handleClose = (0, react_1.useCallback)(function (tabId) {
        var tab = tabs.find(function (t) { return t.tabId === tabId; });
        if (tab && tab.status === "active" && tab.sessionId) {
            if (tab.type === "chat") {
                agent_1.agentIpc.kill(tab.sessionId).catch(function () { });
                // Permanently delete persisted session data
                agent_1.agentIpc.deletePersistedSession(tab.sessionId).catch(function () { });
                agentStore_1.useAgentStore.getState().removeTab(tab.sessionId);
            }
            else {
                terminal_1.terminalIpc.kill(tab.sessionId).catch(function () { });
            }
        }
        removeTab(tabId);
    }, [removeTab, tabs]);
    if (tabs.length === 0) {
        return (<div className="flex h-full flex-col items-center justify-center gap-4">
        <lucide_react_2.MessageSquare className="h-12 w-12 text-muted-foreground/30"/>
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">No sessions</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Start a new agent to get going
          </p>
        </div>
        <button onClick={onNewTerminal} className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <lucide_react_1.Plus className="h-4 w-4"/>
          New Agent
        </button>
      </div>);
    }
    var showCellChrome = layoutMode !== "tabs";
    return (<div className="flex h-full flex-col">
      {/* Compact toolbar */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b px-2">
        {/* Layout mode toggle */}
        <div className="flex items-center rounded-md border bg-muted/50 p-0.5">
          {LAYOUT_OPTIONS.map(function (opt) { return (<button key={opt.mode} onClick={function () { return setLayoutMode(opt.mode); }} title={opt.label} className={(0, utils_1.cn)("flex h-6 w-6 items-center justify-center rounded-sm transition-colors", layoutMode === opt.mode
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground")}>
              <opt.icon className="h-3.5 w-3.5"/>
            </button>); })}
        </div>

        {/* Tab bar — only in tabs mode */}
        {layoutMode === "tabs" && (<div className="flex flex-1 items-center overflow-x-auto">
            {tabs.map(function (tab) { return (<TerminalTab_1.TerminalTab key={tab.tabId} tab={tab} isActive={tab.tabId === activeTabId} onSelect={function () { return setActiveTab(tab.tabId); }} onClose={function () { return handleClose(tab.tabId); }}/>); })}
          </div>)}

        {layoutMode !== "tabs" && (<span className="text-xs text-muted-foreground">
            {tabs.length} session{tabs.length !== 1 ? "s" : ""}
          </span>)}

        <div className="flex-1"/>

        <CommitPushButton_1.CommitPushButton />

        <button onClick={onNewTerminal} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground" title="New Agent (⌘⇧`)">
          <lucide_react_1.Plus className="h-3.5 w-3.5"/>
        </button>
      </div>

      {/* Content area — SINGLE render path, never unmounts terminals */}
      <div className={(0, utils_1.cn)("flex-1 overflow-hidden relative", layoutMode === "grid" && "grid gap-1 p-1", layoutMode === "horizontal-scroll" && "flex gap-1 overflow-x-auto p-1")} style={layoutMode === "grid"
            ? {
                gridTemplateColumns: "repeat(".concat(computeGridCols(tabs.length), ", 1fr)"),
                gridAutoRows: "1fr",
            }
            : undefined}>
        {tabs.map(function (tab) {
            var isActive = tab.tabId === activeTabId;
            var agentTab = tab.type === "chat" && tab.sessionId
                ? agentTabs.find(function (entry) { return entry.sessionId === tab.sessionId; })
                : undefined;
            var agentState = agentTab === null || agentTab === void 0 ? void 0 : agentTab.state;
            var isAgentRunning = agentState === "thinking" ||
                agentState === "executing" ||
                agentState === "awaiting_approval";
            return (<div key={tab.tabId} className={(0, utils_1.cn)(
                // Tabs mode: absolute fill, flex column for child stretching, hide inactive
                layoutMode === "tabs" && "absolute inset-0 flex flex-col", layoutMode === "tabs" && !isActive && "invisible", 
                // Grid mode: each cell fills its grid area
                layoutMode === "grid" && "flex flex-col overflow-hidden rounded-md border min-h-0", layoutMode === "grid" && isActive && "ring-1 ring-primary border-primary", layoutMode === "grid" && !isActive && "border-border", 
                // Horizontal scroll: fixed or proportional width
                layoutMode === "horizontal-scroll" && "h-full flex-shrink-0 flex flex-col overflow-hidden rounded-md border", layoutMode === "horizontal-scroll" && isActive && "ring-1 ring-primary border-primary", layoutMode === "horizontal-scroll" && !isActive && "border-border")} style={layoutMode === "horizontal-scroll"
                    ? { width: tabs.length <= 2 ? "".concat(100 / tabs.length, "%") : "600px" }
                    : undefined} onClick={showCellChrome ? function () { return setActiveTab(tab.tabId); } : undefined}>
              {/* Cell header — only in grid/columns modes */}
              {showCellChrome && (<div className="flex h-7 shrink-0 items-center gap-2 border-b bg-sidebar/50 px-2">
                  <span className="flex-1 truncate text-xs font-medium text-muted-foreground">
                    {tab.label}
                  </span>
                  {isAgentRunning && (<lucide_react_1.Loader2 className="h-3 w-3 animate-spin text-muted-foreground"/>)}
                  {tab.mode !== "Normal" && (<span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                      {tab.mode === "Plan" ? "plan" : "yolo"}
                    </span>)}
                  <button onClick={function (e) {
                        e.stopPropagation();
                        handleClose(tab.tabId);
                    }} className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                    <lucide_react_1.X className="h-3 w-3"/>
                  </button>
                </div>)}
              <div className="flex-1 overflow-hidden">
                {tab.status === "pre-session" ? (<PreSessionView_1.PreSessionView tabId={tab.tabId} workspaceId={tab.workspaceId}/>) : tab.type === "chat" ? (<ChatErrorBoundary>
                    {(agentTab === null || agentTab === void 0 ? void 0 : agentTab.provider) === "claude" || tab.cliName === "claude" ? (<ClaudeChatView_1.ClaudeChatView sessionId={tab.sessionId}/>) : (<ChatView_1.ChatView sessionId={tab.sessionId}/>)}
                  </ChatErrorBoundary>) : (<TerminalView_1.TerminalView sessionId={tab.sessionId} isActive={isActive} alwaysVisible={showCellChrome}/>)}
              </div>
            </div>);
        })}
      </div>
    </div>);
}
