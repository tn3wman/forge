"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.useAgentEventBridge = useAgentEventBridge;
var react_1 = require("react");
var event_1 = require("@tauri-apps/api/event");
var agentStore_1 = require("@/stores/agentStore");
var agent_1 = require("@/ipc/agent");
var agentPersistence_1 = require("@/lib/agentPersistence");
function hasPendingApproval(messages, toolUseId) {
    if (!messages || !toolUseId)
        return false;
    return messages.some(function (message) {
        return message.type === "status" &&
            message.state === "awaiting_approval" &&
            message.toolUseId === toolUseId &&
            !message.resolved;
    });
}
function shouldAutoApprove(mode) {
    return mode === "fullAccess";
}
function handleAgentEvent(payload) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    var sessionId = payload.sessionId, event = payload.event;
    var store = agentStore_1.useAgentStore.getState();
    var now = Date.now();
    switch (event.type) {
        case "system_init": {
            if (event.model)
                store.setModel(sessionId, event.model);
            if (event.sessionId)
                store.setConversationId(sessionId, event.sessionId);
            store.updateTabMeta(sessionId, __assign(__assign(__assign({}, (event.sessionId ? { conversationId: event.sessionId } : {})), (event.model ? { model: event.model } : {})), (event.permissionMode ? { permissionMode: event.permissionMode } : {})));
            // Sync plan mode state from SDK permission mode transitions
            if (event.permissionMode) {
                var tab = store.tabs.find(function (t) { return t.sessionId === sessionId; });
                if (tab) {
                    if (event.permissionMode === "plan") {
                        // SDK entered plan mode
                        store.updateTabMeta(sessionId, { planMode: true });
                    }
                    else if (tab.planMode && event.permissionMode !== "plan") {
                        // SDK exited plan mode (plan approved, now executing)
                        // Keep planMode true in UI, permissionMode reflects execution phase
                    }
                    // Only sync UI mode selector for non-plan permission modes
                    if (event.permissionMode !== "plan" && tab.mode !== event.permissionMode) {
                        var mapped = event.permissionMode;
                        if (mapped === "supervised" || mapped === "assisted" || mapped === "fullAccess") {
                            store.updateTabMode(sessionId, mapped);
                        }
                    }
                }
            }
            store.updateTabState(sessionId, "thinking");
            break;
        }
        case "session_meta": {
            store.updateTabMeta(sessionId, __assign(__assign(__assign(__assign(__assign(__assign(__assign({}, (event.provider ? { provider: event.provider } : {})), (event.conversationId ? { conversationId: event.conversationId } : {})), (event.agent ? { agent: event.agent } : {})), (event.effort ? { effort: event.effort } : {})), (event.claudePath ? { claudePath: event.claudePath } : {})), (event.slashCommands ? { slashCommands: event.slashCommands } : {})), (Array.isArray(event.slashCommands)
                ? { capabilitiesLoaded: true }
                : {})));
            if (event.conversationId) {
                store.setConversationId(sessionId, event.conversationId);
            }
            // Persist session meta updates
            void agent_1.agentIpc.updatePersistedSessionMeta(sessionId, __assign(__assign(__assign(__assign({}, (event.provider ? { provider: event.provider } : {})), (event.conversationId ? { conversationId: event.conversationId } : {})), (event.agent ? { agent: event.agent } : {})), (event.effort ? { effort: event.effort } : {}))).catch(function () { });
            break;
        }
        case "assistant_message_start": {
            store.startAssistantMessage(sessionId, event.messageId, event.turnId);
            store.updateTabState(sessionId, "thinking");
            break;
        }
        case "assistant_message_delta": {
            store.appendAssistantDelta(sessionId, event.messageId, (_a = event.contentDelta) !== null && _a !== void 0 ? _a : "");
            store.updateTabState(sessionId, "thinking");
            break;
        }
        case "assistant_message_complete": {
            store.completeAssistantMessage(sessionId, event.messageId, event.content, event.turnId);
            store.completeReasoning(sessionId, event.messageId, event.turnId);
            store.updateTabState(sessionId, "thinking");
            // Persist completed assistant message for crash safety
            {
                var msgs = agentStore_1.useAgentStore.getState().messagesBySession[sessionId];
                if (msgs) {
                    var assistantMsg = void 0;
                    for (var i = msgs.length - 1; i >= 0; i--) {
                        if (msgs[i].type === "assistant" && msgs[i].messageId === event.messageId) {
                            assistantMsg = msgs[i];
                            break;
                        }
                    }
                    if (assistantMsg) {
                        (0, agentPersistence_1.persistSingleMessage)(sessionId, assistantMsg);
                    }
                }
            }
            break;
        }
        case "thinking_start": {
            store.createPendingAssistant(sessionId, event.turnId);
            store.updateTabState(sessionId, "thinking");
            break;
        }
        case "reasoning_delta": {
            store.appendReasoningDelta(sessionId, (_b = event.contentDelta) !== null && _b !== void 0 ? _b : "", event.messageId, event.turnId);
            store.updateTabState(sessionId, "thinking");
            break;
        }
        case "reasoning_complete": {
            store.completeReasoning(sessionId, event.messageId, event.turnId);
            break;
        }
        case "tool_use_start": {
            store.startToolUse(sessionId, event.toolUseId, event.name, event.input, event.turnId);
            store.updateTabState(sessionId, "executing");
            break;
        }
        case "tool_input_delta": {
            store.appendToolInputDelta(sessionId, event.toolUseId, event.inputDelta);
            store.updateTabState(sessionId, "executing");
            break;
        }
        case "tool_progress": {
            store.updateToolProgress(sessionId, event.toolUseId, event.name, event.status);
            store.updateTabState(sessionId, "executing");
            break;
        }
        case "tool_result_delta": {
            store.appendToolResultDelta(sessionId, event.toolUseId, event.contentDelta, event.isError);
            store.updateTabState(sessionId, "executing");
            break;
        }
        case "tool_result_complete": {
            store.completeToolResult(sessionId, event.toolUseId, event.content, event.isError);
            store.updateTabState(sessionId, event.isError ? "error" : "thinking");
            // Persist tool_use + tool_result pair
            {
                var msgs = agentStore_1.useAgentStore.getState().messagesBySession[sessionId];
                if (msgs) {
                    var toPersist = [];
                    for (var i = msgs.length - 1; i >= 0; i--) {
                        var m = msgs[i];
                        if (m.toolUseId === event.toolUseId && (m.type === "tool_use" || m.type === "tool_result")) {
                            toPersist.push(m);
                        }
                    }
                    if (toPersist.length > 0) {
                        (0, agentPersistence_1.persistMessagesForSession)(sessionId, toPersist);
                    }
                }
            }
            break;
        }
        case "approval_requested": {
            var tab = store.tabs.find(function (t) { return t.sessionId === sessionId; });
            var currentMode = (_c = tab === null || tab === void 0 ? void 0 : tab.mode) !== null && _c !== void 0 ? _c : "supervised";
            if (event.toolUseId && shouldAutoApprove(currentMode)) {
                void agent_1.agentIpc.respondPermission(sessionId, event.toolUseId, true).catch(function (err) {
                    console.error("Failed to auto-approve:", err);
                });
                store.appendMessage(sessionId, {
                    id: "auto-approved-".concat(event.approvalId, "-").concat(now),
                    type: "status",
                    content: "Auto-approved ".concat((_d = event.toolName) !== null && _d !== void 0 ? _d : "tool", " (").concat(currentMode, " mode)"),
                    state: "awaiting_approval",
                    approvalId: event.approvalId,
                    toolUseId: event.toolUseId,
                    toolName: event.toolName,
                    toolInput: event.input,
                    timestamp: now,
                    collapsed: false,
                    resolved: true,
                });
                store.updateTabState(sessionId, "executing");
                break;
            }
            store.appendMessage(sessionId, {
                id: "approval-".concat(event.approvalId, "-").concat(now),
                type: "status",
                content: event.detail,
                detail: event.detail,
                state: "awaiting_approval",
                approvalId: event.approvalId,
                toolUseId: event.toolUseId,
                toolName: event.toolName,
                toolInput: event.input,
                timestamp: now,
                collapsed: false,
            });
            store.updateTabState(sessionId, "awaiting_approval");
            break;
        }
        case "approval_resolved": {
            store.resolveApproval(sessionId, event.approvalId, event.allow);
            store.updateTabState(sessionId, event.allow ? "executing" : "thinking");
            break;
        }
        case "status": {
            store.updateTabState(sessionId, event.state);
            if (event.state === "awaiting_approval") {
                var messages = store.messagesBySession[sessionId];
                if (!hasPendingApproval(messages, event.toolUseId)) {
                    store.appendMessage(sessionId, {
                        id: "status-".concat(sessionId, "-").concat((_e = event.toolUseId) !== null && _e !== void 0 ? _e : now, "-").concat(now),
                        type: "status",
                        content: "Awaiting approval".concat(event.tool ? " for ".concat(event.tool) : ""),
                        state: event.state,
                        toolUseId: event.toolUseId,
                        toolName: event.tool,
                        turnId: event.turnId,
                        messageId: event.messageId,
                        timestamp: now,
                        collapsed: false,
                    });
                }
            }
            break;
        }
        case "result": {
            store.updateTabCost(sessionId, (_f = event.totalCostUsd) !== null && _f !== void 0 ? _f : 0);
            if (event.isError) {
                store.markAssistantError(sessionId, event.resultText);
                store.finalizeAllPending(sessionId);
                store.updateTabState(sessionId, "error");
            }
            else {
                // Fallback: if streaming events were lost, populate the assistant
                // message with the final result text so the user sees *something*.
                if (event.resultText) {
                    store.fillEmptyAssistant(sessionId, event.resultText);
                }
                store.completeReasoning(sessionId);
                store.finalizeAllPending(sessionId);
                // Check if this is a plan mode completion — show plan review UI
                var planTab = store.tabs.find(function (t) { return t.sessionId === sessionId; });
                if (planTab === null || planTab === void 0 ? void 0 : planTab.planMode) {
                    var messages = (_g = store.messagesBySession[sessionId]) !== null && _g !== void 0 ? _g : [];
                    // Find the last Write tool that wrote to a plan file
                    var planFilePath = "";
                    var planContent = "";
                    for (var i = messages.length - 1; i >= 0; i--) {
                        var m = messages[i];
                        if (m.type === "tool_use" && ((_h = m.toolName) === null || _h === void 0 ? void 0 : _h.toLowerCase()) === "write" && m.toolInput) {
                            var fp = m.toolInput.file_path;
                            if (fp && (fp.includes("/plans/") || fp.includes(".claude/plans"))) {
                                planFilePath = fp;
                                planContent = (_j = m.toolInput.content) !== null && _j !== void 0 ? _j : "";
                                break;
                            }
                        }
                    }
                    if (planFilePath || event.resultText) {
                        store.updateTabMeta(sessionId, {
                            planReview: {
                                filePath: planFilePath || "plan",
                                content: planContent || event.resultText || "",
                                underlyingMode: planTab.mode,
                            },
                        });
                        store.updateTabState(sessionId, "awaiting_approval");
                    }
                    else {
                        store.updateTabState(sessionId, "completed");
                    }
                }
                else {
                    store.updateTabState(sessionId, "completed");
                }
            }
            // Batch-persist all messages as safety net and update session cost
            {
                var allMsgs = agentStore_1.useAgentStore.getState().messagesBySession[sessionId];
                if (allMsgs) {
                    (0, agentPersistence_1.persistMessagesForSession)(sessionId, allMsgs);
                }
                var tab = agentStore_1.useAgentStore.getState().tabs.find(function (t) { return t.sessionId === sessionId; });
                void agent_1.agentIpc.updatePersistedSessionMeta(sessionId, {
                    totalCost: (_k = event.totalCostUsd) !== null && _k !== void 0 ? _k : 0,
                    conversationId: (_l = tab === null || tab === void 0 ? void 0 : tab.conversationId) !== null && _l !== void 0 ? _l : undefined,
                }).catch(function () { });
            }
            break;
        }
        case "plan_delta": {
            // Map plan deltas to assistant message deltas so plan content is visible
            store.appendAssistantDelta(sessionId, event.itemId, (_m = event.contentDelta) !== null && _m !== void 0 ? _m : "");
            store.updateTabState(sessionId, "thinking");
            break;
        }
        case "plan_updated": {
            // Format plan steps as an assistant message for display
            var steps = event.steps;
            if (steps === null || steps === void 0 ? void 0 : steps.length) {
                var formatted = steps
                    .map(function (s) {
                    var icon = s.status === "completed" ? "✓" : s.status === "inProgress" ? "→" : "○";
                    return "".concat(icon, " ").concat(s.step);
                })
                    .join("\n");
                store.fillEmptyAssistant(sessionId, formatted);
            }
            break;
        }
        case "raw":
            break;
    }
}
function handleAgentExit(payload) {
    var store = agentStore_1.useAgentStore.getState();
    var tab = store.tabs.find(function (entry) { return entry.sessionId === payload.sessionId; });
    if (!tab)
        return;
    if (tab.state === "completed" || tab.state === "error")
        return;
    store.completeReasoning(payload.sessionId);
    store.finalizeAllPending(payload.sessionId);
    store.updateTabState(payload.sessionId, "completed");
}
function initAgentEventBridge() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (!globalThis.__forgeAgentBridgePromise) {
                globalThis.__forgeAgentBridgePromise = Promise.all([
                    (0, event_1.listen)("agent-event", function (event) {
                        handleAgentEvent(event.payload);
                    }),
                    (0, event_1.listen)("agent-exit", function (event) {
                        handleAgentExit(event.payload);
                    }),
                ]).then(function () { return undefined; });
            }
            return [2 /*return*/, globalThis.__forgeAgentBridgePromise];
        });
    });
}
function useAgentEventBridge() {
    (0, react_1.useEffect)(function () {
        void initAgentEventBridge();
    }, []);
}
