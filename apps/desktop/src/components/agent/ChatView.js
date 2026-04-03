"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatView = ChatView;
var react_1 = require("react");
var agentStore_1 = require("@/stores/agentStore");
var agent_1 = require("@/ipc/agent");
var agentPersistence_1 = require("@/lib/agentPersistence");
var terminalStore_1 = require("@/stores/terminalStore");
var ChatMessage_1 = require("./ChatMessage");
var ToolCallCard_1 = require("./ToolCallCard");
var PermissionPrompt_1 = require("./PermissionPrompt");
var PlanReviewCard_1 = require("./PlanReviewCard");
var AgentStatusBar_1 = require("./AgentStatusBar");
var UnifiedInputCard_1 = require("./UnifiedInputCard");
var useCliDiscovery_1 = require("@/hooks/useCliDiscovery");
var PERMISSIVE_MODES = ["fullAccess"];
function ChatView(_a) {
    var _this = this;
    var _b, _c;
    var sessionId = _a.sessionId, _d = _a.variant, variant = _d === void 0 ? "default" : _d;
    var tab = (0, agentStore_1.useAgentStore)(function (s) { return s.tabs.find(function (t) { return t.sessionId === sessionId; }); });
    var messages = (0, agentStore_1.useAgentStore)(function (s) { var _a; return (_a = s.messagesBySession[sessionId]) !== null && _a !== void 0 ? _a : []; });
    var appendMessage = (0, agentStore_1.useAgentStore)(function (s) { return s.appendMessage; });
    var createPendingAssistant = (0, agentStore_1.useAgentStore)(function (s) { return s.createPendingAssistant; });
    var toggleMessageCollapsed = (0, agentStore_1.useAgentStore)(function (s) { return s.toggleMessageCollapsed; });
    var toggleReasoningCollapsed = (0, agentStore_1.useAgentStore)(function (s) { return s.toggleReasoningCollapsed; });
    var updateTabState = (0, agentStore_1.useAgentStore)(function (s) { return s.updateTabState; });
    var updateTabMeta = (0, agentStore_1.useAgentStore)(function (s) { return s.updateTabMeta; });
    var updateTabMode = (0, agentStore_1.useAgentStore)(function (s) { return s.updateTabMode; });
    var clearMessages = (0, agentStore_1.useAgentStore)(function (s) { return s.clearMessages; });
    var activeTabId = (0, agentStore_1.useAgentStore)(function (s) { return s.activeTabId; });
    var discoveredSlashCommands = (0, useCliDiscovery_1.useSlashCommands)((_b = tab === null || tab === void 0 ? void 0 : tab.cliName) !== null && _b !== void 0 ? _b : null).data;
    var scrollRef = (0, react_1.useRef)(null);
    var inputFocusedRef = (0, react_1.useRef)(false);
    var isClaude = (tab === null || tab === void 0 ? void 0 : tab.provider) === "claude" || variant === "claude" || (tab === null || tab === void 0 ? void 0 : tab.cliName) === "claude";
    var slashCommands = isClaude && ((_c = tab === null || tab === void 0 ? void 0 : tab.slashCommands) === null || _c === void 0 ? void 0 : _c.length)
        ? tab.slashCommands
        : (discoveredSlashCommands !== null && discoveredSlashCommands !== void 0 ? discoveredSlashCommands : []);
    // Auto-scroll on new messages
    (0, react_1.useEffect)(function () {
        var el = scrollRef.current;
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }, [messages]);
    // Build a map of toolUseId -> tool_result message
    var toolResultMap = (0, react_1.useMemo)(function () {
        var map = new Map();
        for (var _i = 0, messages_1 = messages; _i < messages_1.length; _i++) {
            var msg = messages_1[_i];
            if (msg.type === "tool_result" && msg.toolUseId) {
                map.set(msg.toolUseId, msg);
            }
        }
        return map;
    }, [messages]);
    // Find the pending permission prompt
    var pendingPermission = (0, react_1.useMemo)(function () {
        for (var i = messages.length - 1; i >= 0; i--) {
            var msg = messages[i];
            if (msg.type === "status" && msg.state === "awaiting_approval" && msg.toolUseId) {
                if (!msg.resolved && !toolResultMap.has(msg.toolUseId)) {
                    return msg;
                }
            }
            if (msg.type === "assistant" || msg.type === "user")
                break;
        }
        return null;
    }, [messages, toolResultMap]);
    // Keyboard shortcut for permission prompts (y/n)
    (0, react_1.useEffect)(function () {
        if (!pendingPermission || activeTabId !== sessionId)
            return;
        var handler = function (e) {
            if (inputFocusedRef.current)
                return;
            if (e.metaKey || e.ctrlKey || e.altKey)
                return;
            var toolUseId = pendingPermission.toolUseId;
            if (!toolUseId)
                return;
            if (e.key === "y") {
                e.preventDefault();
                agent_1.agentIpc.respondPermission(sessionId, toolUseId, true);
            }
            else if (e.key === "n") {
                e.preventDefault();
                agent_1.agentIpc.respondPermission(sessionId, toolUseId, false);
            }
        };
        document.addEventListener("keydown", handler);
        return function () { return document.removeEventListener("keydown", handler); };
    }, [pendingPermission, sessionId, activeTabId]);
    var handleSend = (0, react_1.useCallback)(function (text, images) { return __awaiter(_this, void 0, void 0, function () {
        var now, userMsg, liveSessions, isAlive, newSession, agentStore, termStore, termTab, oldMessages, _i, oldMessages_1, msg, persisted, _a;
        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
        return __generator(this, function (_v) {
            switch (_v.label) {
                case 0:
                    now = Date.now();
                    userMsg = {
                        id: "user-".concat(now),
                        type: "user",
                        content: text,
                        timestamp: now,
                        collapsed: false,
                        images: (images === null || images === void 0 ? void 0 : images.length) ? images : undefined,
                        streamState: "completed",
                    };
                    if (!((tab === null || tab === void 0 ? void 0 : tab.state) === "completed" || (tab === null || tab === void 0 ? void 0 : tab.state) === "error")) return [3 /*break*/, 6];
                    _v.label = 1;
                case 1:
                    _v.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, agent_1.agentIpc.listSessions()];
                case 2:
                    liveSessions = _v.sent();
                    isAlive = liveSessions.some(function (s) { return s.id === sessionId; });
                    if (!!isAlive) return [3 /*break*/, 4];
                    return [4 /*yield*/, agent_1.agentIpc.createSession({
                            cliName: tab.cliName,
                            mode: tab.mode,
                            workingDirectory: undefined, // Will use default
                            workspaceId: "", // Will be filled by backend
                            initialPrompt: text,
                            planMode: tab.planMode,
                            claude: tab.cliName === "claude" ? {
                                provider: "claude",
                                model: tab.model,
                                permissionMode: tab.mode,
                                effort: (_b = tab.effort) !== null && _b !== void 0 ? _b : undefined,
                                planMode: tab.planMode,
                                agent: tab.agent,
                                claudePath: (_c = tab.claudePath) !== null && _c !== void 0 ? _c : undefined,
                            } : undefined,
                        })];
                case 3:
                    newSession = _v.sent();
                    agentStore = agentStore_1.useAgentStore.getState();
                    termStore = terminalStore_1.useTerminalStore.getState();
                    termTab = termStore.tabs.find(function (t) { return t.sessionId === sessionId; });
                    if (termTab) {
                        termStore.activateTab(termTab.tabId, newSession.id, {
                            label: newSession.displayName,
                            cliName: newSession.cliName,
                            type: "chat",
                        });
                    }
                    oldMessages = (_d = agentStore.messagesBySession[sessionId]) !== null && _d !== void 0 ? _d : [];
                    agentStore.removeTab(sessionId);
                    agentStore.addTab({
                        sessionId: newSession.id,
                        label: newSession.displayName,
                        cliName: newSession.cliName,
                        mode: tab.mode,
                        state: "thinking",
                        conversationId: (_e = newSession.conversationId) !== null && _e !== void 0 ? _e : null,
                        provider: tab.provider,
                        model: (_f = newSession.model) !== null && _f !== void 0 ? _f : tab.model,
                        permissionMode: (_g = newSession.permissionMode) !== null && _g !== void 0 ? _g : tab.permissionMode,
                        agent: (_h = newSession.agent) !== null && _h !== void 0 ? _h : tab.agent,
                        effort: (_j = newSession.effort) !== null && _j !== void 0 ? _j : tab.effort,
                        claudePath: (_k = newSession.claudePath) !== null && _k !== void 0 ? _k : tab.claudePath,
                        planMode: tab.planMode,
                        totalCost: 0,
                    });
                    // Re-add old messages for continuity in UI
                    for (_i = 0, oldMessages_1 = oldMessages; _i < oldMessages_1.length; _i++) {
                        msg = oldMessages_1[_i];
                        agentStore.appendMessage(newSession.id, msg);
                    }
                    // Add the new user message and persist
                    agentStore.appendMessage(newSession.id, userMsg);
                    agentStore.createPendingAssistant(newSession.id);
                    persisted = (0, agentPersistence_1.sessionInfoToPersistedSession)(newSession.id, (_l = termTab === null || termTab === void 0 ? void 0 : termTab.workspaceId) !== null && _l !== void 0 ? _l : "", newSession.cliName, newSession.displayName, tab.mode, {
                        provider: (_m = newSession.provider) !== null && _m !== void 0 ? _m : tab.provider,
                        model: (_o = newSession.model) !== null && _o !== void 0 ? _o : tab.model,
                        permissionMode: (_p = newSession.permissionMode) !== null && _p !== void 0 ? _p : tab.permissionMode,
                        agent: (_q = newSession.agent) !== null && _q !== void 0 ? _q : tab.agent,
                        effort: (_s = (_r = newSession.effort) !== null && _r !== void 0 ? _r : tab.effort) !== null && _s !== void 0 ? _s : undefined,
                        claudePath: (_u = (_t = newSession.claudePath) !== null && _t !== void 0 ? _t : tab.claudePath) !== null && _u !== void 0 ? _u : undefined,
                        planMode: tab.planMode,
                        conversationId: newSession.conversationId,
                        createdAt: newSession.createdAt,
                    });
                    void agent_1.agentIpc.persistSession(persisted).catch(function () { });
                    // Delete old persisted session
                    void agent_1.agentIpc.deletePersistedSession(sessionId).catch(function () { });
                    return [2 /*return*/];
                case 4: return [3 /*break*/, 6];
                case 5:
                    _a = _v.sent();
                    return [3 /*break*/, 6];
                case 6:
                    appendMessage(sessionId, userMsg);
                    createPendingAssistant(sessionId);
                    updateTabState(sessionId, "thinking");
                    // Persist user message immediately
                    (0, agentPersistence_1.persistSingleMessage)(sessionId, userMsg);
                    void agent_1.agentIpc.sendMessage(sessionId, text, images).catch(function (error) {
                        console.error("Failed to send agent message:", error);
                    });
                    return [2 /*return*/];
            }
        });
    }); }, [sessionId, tab, appendMessage, createPendingAssistant, updateTabState]);
    var handleModeChange = (0, react_1.useCallback)(function (mode) {
        var _a;
        updateTabMode(sessionId, mode);
        void agent_1.agentIpc.updatePermissionMode(sessionId, mode).catch(function (err) {
            console.error("Failed to update permission mode:", err);
        });
        // Auto-resolve any pending approvals when switching to a permissive mode
        if (PERMISSIVE_MODES.includes(mode)) {
            var currentMessages = (_a = agentStore_1.useAgentStore.getState().messagesBySession[sessionId]) !== null && _a !== void 0 ? _a : [];
            for (var _i = 0, currentMessages_1 = currentMessages; _i < currentMessages_1.length; _i++) {
                var msg = currentMessages_1[_i];
                if (msg.type === "status" &&
                    msg.state === "awaiting_approval" &&
                    !msg.resolved &&
                    msg.toolUseId) {
                    void agent_1.agentIpc.respondPermission(sessionId, msg.toolUseId, true).catch(function (err) {
                        console.error("Failed to auto-approve pending:", err);
                    });
                }
            }
        }
    }, [sessionId, updateTabMode]);
    var handlePlanModeChange = (0, react_1.useCallback)(function (newPlanMode) {
        updateTabMeta(sessionId, { planMode: newPlanMode });
        // Send /plan or /default as a message to toggle mid-session
        var cmd = newPlanMode ? "/plan" : "/default";
        void agent_1.agentIpc.sendMessage(sessionId, cmd).catch(function (err) {
            console.error("Failed to toggle plan mode:", err);
        });
    }, [sessionId, updateTabMeta]);
    var handleAbort = (0, react_1.useCallback)(function () {
        void agent_1.agentIpc.abort(sessionId).catch(function (error) {
            console.error("Failed to abort agent session:", error);
        });
    }, [sessionId]);
    if (!tab) {
        return (<div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Session not found</p>
      </div>);
    }
    return (<div className="flex h-full flex-col">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map(function (msg) {
            var _a, _b;
            if (msg.type === "tool_result")
                return null;
            if (msg.type === "tool_use") {
                var result = msg.toolUseId ? toolResultMap.get(msg.toolUseId) : undefined;
                return (<ToolCallCard_1.ToolCallCard key={msg.id} toolUse={msg} toolResult={result} collapsed={msg.collapsed} onToggle={function () { return toggleMessageCollapsed(sessionId, msg.id); }}/>);
            }
            if (msg.type === "status" && msg.state === "awaiting_approval" && !msg.resolved) {
                return (<PermissionPrompt_1.PermissionPrompt key={msg.id} message={msg} sessionId={sessionId}/>);
            }
            if (msg.type === "status") {
                return (<p key={msg.id} className="text-center text-xs text-muted-foreground">
                {msg.content}
              </p>);
            }
            // Skip empty completed assistant messages (issue #6)
            if (msg.type === "assistant" &&
                msg.streamState !== "pending" &&
                msg.streamState !== "streaming" &&
                !((_a = msg.content) === null || _a === void 0 ? void 0 : _a.trim()) &&
                !((_b = msg.reasoning) === null || _b === void 0 ? void 0 : _b.trim())) {
                return null;
            }
            if (msg.type === "user" || msg.type === "assistant") {
                return (<ChatMessage_1.ChatMessage key={msg.id} message={msg} onToggleReasoning={msg.type === "assistant"
                        ? function () { return toggleReasoningCollapsed(sessionId, msg.id); }
                        : undefined}/>);
            }
            if (msg.type === "system") {
                return (<p key={msg.id} className="text-center text-xs text-muted-foreground">
                {msg.content}
              </p>);
            }
            if (msg.type === "error") {
                return (<p key={msg.id} className="text-center text-xs text-red-400">
                {msg.content}
              </p>);
            }
            return null;
        })}

        {tab.planReview && (<PlanReviewCard_1.PlanReviewCard planFilePath={tab.planReview.filePath} planContent={tab.planReview.content} sessionId={sessionId} underlyingMode={tab.planReview.underlyingMode}/>)}
      </div>

      <AgentStatusBar_1.AgentStatusBar state={tab.state} model={tab.model} permissionMode={tab.permissionMode} agent={tab.agent} effort={tab.effort} totalCost={tab.totalCost} planMode={tab === null || tab === void 0 ? void 0 : tab.planMode}/>

      <UnifiedInputCard_1.UnifiedInputCard onSend={handleSend} onAbort={handleAbort} agentState={tab.state} mode={tab.mode} onModeChange={handleModeChange} planMode={tab === null || tab === void 0 ? void 0 : tab.planMode} onPlanModeChange={handlePlanModeChange} slashCommands={slashCommands !== null && slashCommands !== void 0 ? slashCommands : []} onFocusChange={function (focused) {
            inputFocusedRef.current = focused;
        }} onClear={function () { return clearMessages(sessionId); }}/>
    </div>);
}
