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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAgentStore = void 0;
var zustand_1 = require("zustand");
var localIdCounter = 0;
function nextLocalId(prefix) {
    return "".concat(prefix, "-").concat(Date.now(), "-").concat(localIdCounter++);
}
function serializeToolInput(toolInput) {
    if (!toolInput)
        return undefined;
    if (Object.keys(toolInput).length === 0)
        return undefined;
    return JSON.stringify(toolInput, null, 2);
}
function getMessagesForSession(messagesBySession, sessionId) {
    var _a;
    return (_a = messagesBySession[sessionId]) !== null && _a !== void 0 ? _a : [];
}
function findMessageIndex(messages, predicate) {
    for (var i = messages.length - 1; i >= 0; i--) {
        if (predicate(messages[i]))
            return i;
    }
    return -1;
}
function findAssistantIndex(messages, messageId, turnId) {
    if (messageId) {
        var exact = findMessageIndex(messages, function (message) { return message.type === "assistant" && message.messageId === messageId; });
        if (exact >= 0)
            return exact;
    }
    if (turnId) {
        var turnMatch = findMessageIndex(messages, function (message) {
            return message.type === "assistant" &&
                message.turnId === turnId &&
                message.streamState !== "completed" &&
                message.streamState !== "error";
        });
        if (turnMatch >= 0)
            return turnMatch;
    }
    return findMessageIndex(messages, function (message) {
        return message.type === "assistant" &&
            (message.streamState === "pending" || message.streamState === "streaming");
    });
}
function upsertAssistant(messages, messageId, turnId) {
    var idx = findAssistantIndex(messages, messageId, turnId);
    if (idx >= 0) {
        return { messages: __spreadArray([], messages, true), idx: idx };
    }
    var next = __spreadArray([], messages, true);
    next.push({
        id: nextLocalId("assistant"),
        type: "assistant",
        content: "",
        timestamp: Date.now(),
        collapsed: false,
        messageId: messageId,
        turnId: turnId,
        streamState: "pending",
        reasoning: "",
        reasoningState: "pending",
        reasoningCollapsed: false,
    });
    return { messages: next, idx: next.length - 1 };
}
function upsertToolResult(messages, toolUseId) {
    var idx = findMessageIndex(messages, function (message) { return message.type === "tool_result" && message.toolUseId === toolUseId; });
    if (idx >= 0) {
        return { messages: __spreadArray([], messages, true), idx: idx };
    }
    var next = __spreadArray([], messages, true);
    next.push({
        id: nextLocalId("tool-result"),
        type: "tool_result",
        content: "",
        timestamp: Date.now(),
        collapsed: false,
        toolUseId: toolUseId,
        streamState: "pending",
    });
    return { messages: next, idx: next.length - 1 };
}
exports.useAgentStore = (0, zustand_1.create)(function (set) { return ({
    tabs: [],
    activeTabId: null,
    messagesBySession: {},
    addTab: function (tab) {
        return set(function (s) {
            var _a;
            var _b;
            return ({
                tabs: __spreadArray(__spreadArray([], s.tabs, true), [tab], false),
                activeTabId: tab.sessionId,
                messagesBySession: __assign(__assign({}, s.messagesBySession), (_a = {}, _a[tab.sessionId] = (_b = s.messagesBySession[tab.sessionId]) !== null && _b !== void 0 ? _b : [], _a)),
            });
        });
    },
    removeTab: function (sessionId) {
        return set(function (s) {
            var _a, _b;
            var tabs = s.tabs.filter(function (t) { return t.sessionId !== sessionId; });
            var activeTabId = s.activeTabId === sessionId
                ? (_b = (_a = tabs[tabs.length - 1]) === null || _a === void 0 ? void 0 : _a.sessionId) !== null && _b !== void 0 ? _b : null
                : s.activeTabId;
            var _c = s.messagesBySession, _d = sessionId, _ = _c[_d], messagesBySession = __rest(_c, [typeof _d === "symbol" ? _d : _d + ""]);
            return { tabs: tabs, activeTabId: activeTabId, messagesBySession: messagesBySession };
        });
    },
    setActiveTab: function (sessionId) { return set({ activeTabId: sessionId }); },
    appendMessage: function (sessionId, message) {
        return set(function (s) {
            var _a;
            return ({
                messagesBySession: __assign(__assign({}, s.messagesBySession), (_a = {}, _a[sessionId] = __spreadArray(__spreadArray([], getMessagesForSession(s.messagesBySession, sessionId), true), [message], false), _a)),
            });
        });
    },
    createPendingAssistant: function (sessionId, turnId) {
        return set(function (s) {
            var _a;
            var messages = getMessagesForSession(s.messagesBySession, sessionId);
            var idx = findAssistantIndex(messages, undefined, turnId);
            if (idx >= 0)
                return s;
            return {
                messagesBySession: __assign(__assign({}, s.messagesBySession), (_a = {}, _a[sessionId] = __spreadArray(__spreadArray([], messages, true), [
                    {
                        id: nextLocalId("assistant"),
                        type: "assistant",
                        content: "",
                        timestamp: Date.now(),
                        collapsed: false,
                        turnId: turnId,
                        streamState: "pending",
                        reasoning: "",
                        reasoningState: "pending",
                        reasoningCollapsed: false,
                    },
                ], false), _a)),
            };
        });
    },
    startAssistantMessage: function (sessionId, messageId, turnId) {
        return set(function (s) {
            var _a;
            var current = getMessagesForSession(s.messagesBySession, sessionId);
            var _b = upsertAssistant(current, messageId, turnId), messages = _b.messages, idx = _b.idx;
            var existing = messages[idx];
            messages[idx] = __assign(__assign({}, existing), { messageId: messageId, turnId: turnId !== null && turnId !== void 0 ? turnId : existing.turnId, streamState: existing.content ? "streaming" : "pending" });
            return {
                messagesBySession: __assign(__assign({}, s.messagesBySession), (_a = {}, _a[sessionId] = messages, _a)),
            };
        });
    },
    appendAssistantDelta: function (sessionId, messageId, contentDelta) {
        return set(function (s) {
            var _a;
            var current = getMessagesForSession(s.messagesBySession, sessionId);
            var _b = upsertAssistant(current, messageId), messages = _b.messages, idx = _b.idx;
            var existing = messages[idx];
            messages[idx] = __assign(__assign({}, existing), { messageId: messageId, content: "".concat(existing.content).concat(contentDelta), streamState: "streaming" });
            return {
                messagesBySession: __assign(__assign({}, s.messagesBySession), (_a = {}, _a[sessionId] = messages, _a)),
            };
        });
    },
    completeAssistantMessage: function (sessionId, messageId, finalText, turnId) {
        return set(function (s) {
            var _a;
            var _b;
            var current = getMessagesForSession(s.messagesBySession, sessionId);
            var _c = upsertAssistant(current, messageId, turnId), messages = _c.messages, idx = _c.idx;
            var existing = messages[idx];
            var content = finalText && finalText.length >= existing.content.length
                ? finalText
                : existing.content;
            var hasContent = content.trim().length > 0 || !!((_b = existing.reasoning) === null || _b === void 0 ? void 0 : _b.trim());
            messages[idx] = __assign(__assign({}, existing), { messageId: messageId, turnId: turnId !== null && turnId !== void 0 ? turnId : existing.turnId, content: content, streamState: hasContent ? "completed" : existing.streamState });
            return {
                messagesBySession: __assign(__assign({}, s.messagesBySession), (_a = {}, _a[sessionId] = messages, _a)),
            };
        });
    },
    appendReasoningDelta: function (sessionId, contentDelta, messageId, turnId) {
        return set(function (s) {
            var _a;
            var _b;
            var current = getMessagesForSession(s.messagesBySession, sessionId);
            var _c = upsertAssistant(current, messageId, turnId), messages = _c.messages, idx = _c.idx;
            var existing = messages[idx];
            messages[idx] = __assign(__assign({}, existing), { messageId: messageId !== null && messageId !== void 0 ? messageId : existing.messageId, turnId: turnId !== null && turnId !== void 0 ? turnId : existing.turnId, reasoning: "".concat((_b = existing.reasoning) !== null && _b !== void 0 ? _b : "").concat(contentDelta), reasoningState: "streaming", reasoningCollapsed: false });
            return {
                messagesBySession: __assign(__assign({}, s.messagesBySession), (_a = {}, _a[sessionId] = messages, _a)),
            };
        });
    },
    completeReasoning: function (sessionId, messageId, turnId) {
        return set(function (s) {
            var _a;
            var current = getMessagesForSession(s.messagesBySession, sessionId);
            var idx = findAssistantIndex(current, messageId, turnId);
            if (idx < 0)
                return s;
            var messages = __spreadArray([], current, true);
            var existing = messages[idx];
            messages[idx] = __assign(__assign({}, existing), { reasoningState: existing.reasoning ? "completed" : existing.reasoningState, reasoningCollapsed: existing.reasoning ? true : existing.reasoningCollapsed });
            return {
                messagesBySession: __assign(__assign({}, s.messagesBySession), (_a = {}, _a[sessionId] = messages, _a)),
            };
        });
    },
    startToolUse: function (sessionId, toolUseId, toolName, toolInput, turnId) {
        return set(function (s) {
            var _a;
            var _b;
            var messages = getMessagesForSession(s.messagesBySession, sessionId);
            var idx = findMessageIndex(messages, function (message) { return message.type === "tool_use" && message.toolUseId === toolUseId; });
            var next = __spreadArray([], messages, true);
            if (idx >= 0) {
                next[idx] = __assign(__assign({}, next[idx]), { toolName: toolName, toolInput: toolInput, toolInputText: (_b = serializeToolInput(toolInput)) !== null && _b !== void 0 ? _b : next[idx].toolInputText, turnId: turnId !== null && turnId !== void 0 ? turnId : next[idx].turnId, streamState: "streaming" });
            }
            else {
                next.push({
                    id: nextLocalId("tool"),
                    type: "tool_use",
                    content: "",
                    timestamp: Date.now(),
                    collapsed: false,
                    toolName: toolName,
                    toolInput: toolInput,
                    toolInputText: serializeToolInput(toolInput),
                    toolUseId: toolUseId,
                    turnId: turnId,
                    streamState: "streaming",
                });
            }
            return {
                messagesBySession: __assign(__assign({}, s.messagesBySession), (_a = {}, _a[sessionId] = next, _a)),
            };
        });
    },
    appendToolInputDelta: function (sessionId, toolUseId, inputDelta) {
        return set(function (s) {
            var _a;
            var _b;
            var messages = getMessagesForSession(s.messagesBySession, sessionId);
            var idx = findMessageIndex(messages, function (message) { return message.type === "tool_use" && message.toolUseId === toolUseId; });
            if (idx < 0)
                return s;
            var next = __spreadArray([], messages, true);
            var existing = next[idx];
            var toolInputText = "".concat((_b = existing.toolInputText) !== null && _b !== void 0 ? _b : "").concat(inputDelta);
            var toolInput = existing.toolInput;
            try {
                var parsed = JSON.parse(toolInputText);
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                    toolInput = parsed;
                }
            }
            catch (_c) {
                // Partial JSON is expected while the tool input is streaming.
            }
            next[idx] = __assign(__assign({}, existing), { toolInputText: toolInputText, toolInput: toolInput, streamState: "streaming" });
            return {
                messagesBySession: __assign(__assign({}, s.messagesBySession), (_a = {}, _a[sessionId] = next, _a)),
            };
        });
    },
    updateToolProgress: function (sessionId, toolUseId, toolName, status) {
        return set(function (s) {
            var _a;
            var messages = getMessagesForSession(s.messagesBySession, sessionId);
            var idx = findMessageIndex(messages, function (message) {
                return message.type === "tool_use" &&
                    (Boolean(toolUseId && message.toolUseId === toolUseId) ||
                        Boolean(!toolUseId && toolName && message.toolName === toolName));
            });
            if (idx < 0)
                return s;
            var next = __spreadArray([], messages, true);
            next[idx] = __assign(__assign({}, next[idx]), { toolName: toolName !== null && toolName !== void 0 ? toolName : next[idx].toolName, toolStatus: status !== null && status !== void 0 ? status : next[idx].toolStatus, streamState: "streaming" });
            return {
                messagesBySession: __assign(__assign({}, s.messagesBySession), (_a = {}, _a[sessionId] = next, _a)),
            };
        });
    },
    appendToolResultDelta: function (sessionId, toolUseId, contentDelta, isError) {
        return set(function (s) {
            var _a;
            var current = getMessagesForSession(s.messagesBySession, sessionId);
            var _b = upsertToolResult(current, toolUseId), messages = _b.messages, idx = _b.idx;
            var existing = messages[idx];
            messages[idx] = __assign(__assign({}, existing), { content: "".concat(existing.content).concat(contentDelta), isError: isError !== null && isError !== void 0 ? isError : existing.isError, streamState: "streaming" });
            return {
                messagesBySession: __assign(__assign({}, s.messagesBySession), (_a = {}, _a[sessionId] = messages, _a)),
            };
        });
    },
    completeToolResult: function (sessionId, toolUseId, content, isError) {
        return set(function (s) {
            var _a;
            var current = getMessagesForSession(s.messagesBySession, sessionId);
            var _b = upsertToolResult(current, toolUseId), messages = _b.messages, idx = _b.idx;
            var existing = messages[idx];
            messages[idx] = __assign(__assign({}, existing), { content: content && content.length >= existing.content.length ? content : existing.content, isError: isError !== null && isError !== void 0 ? isError : existing.isError, streamState: isError ? "error" : "completed" });
            var toolIdx = findMessageIndex(messages, function (message) { return message.type === "tool_use" && message.toolUseId === toolUseId; });
            if (toolIdx >= 0) {
                messages[toolIdx] = __assign(__assign({}, messages[toolIdx]), { streamState: isError ? "error" : "completed" });
            }
            return {
                messagesBySession: __assign(__assign({}, s.messagesBySession), (_a = {}, _a[sessionId] = messages, _a)),
            };
        });
    },
    resolveApproval: function (sessionId, approvalId, allow) {
        return set(function (s) {
            var _a;
            var messages = getMessagesForSession(s.messagesBySession, sessionId);
            var next = messages.map(function (message) {
                if (message.type !== "status" || message.approvalId !== approvalId) {
                    return message;
                }
                return __assign(__assign({}, message), { resolved: true, streamState: "completed", content: allow
                        ? "Approved".concat(message.toolName ? " ".concat(message.toolName) : "")
                        : "Denied".concat(message.toolName ? " ".concat(message.toolName) : "") });
            });
            return {
                messagesBySession: __assign(__assign({}, s.messagesBySession), (_a = {}, _a[sessionId] = next, _a)),
            };
        });
    },
    fillEmptyAssistant: function (sessionId, text) {
        return set(function (s) {
            var _a;
            var messages = getMessagesForSession(s.messagesBySession, sessionId);
            var changed = false;
            var next = messages.map(function (message) {
                if (message.type === "assistant" &&
                    (!message.content || !message.content.trim()) &&
                    (!message.reasoning || !message.reasoning.trim())) {
                    changed = true;
                    return __assign(__assign({}, message), { content: text, streamState: "completed" });
                }
                return message;
            });
            return changed
                ? { messagesBySession: __assign(__assign({}, s.messagesBySession), (_a = {}, _a[sessionId] = next, _a)) }
                : s;
        });
    },
    markAssistantError: function (sessionId, content) {
        return set(function (s) {
            var _a, _b;
            var current = getMessagesForSession(s.messagesBySession, sessionId);
            var idx = findMessageIndex(current, function (message) {
                return message.type === "assistant" &&
                    message.streamState !== "completed" &&
                    message.streamState !== "error";
            });
            if (idx >= 0) {
                var messages = __spreadArray([], current, true);
                var existing = messages[idx];
                messages[idx] = __assign(__assign({}, existing), { content: content || existing.content, streamState: "error", reasoningCollapsed: true, reasoningState: existing.reasoning && existing.reasoningState !== "completed"
                        ? "completed"
                        : existing.reasoningState });
                return {
                    messagesBySession: __assign(__assign({}, s.messagesBySession), (_a = {}, _a[sessionId] = messages, _a)),
                };
            }
            if (!content)
                return s;
            return {
                messagesBySession: __assign(__assign({}, s.messagesBySession), (_b = {}, _b[sessionId] = __spreadArray(__spreadArray([], current, true), [
                    {
                        id: nextLocalId("assistant-error"),
                        type: "error",
                        content: content,
                        timestamp: Date.now(),
                        collapsed: false,
                    },
                ], false), _b)),
            };
        });
    },
    updateTabState: function (sessionId, state) {
        return set(function (s) { return ({
            tabs: s.tabs.map(function (t) {
                return t.sessionId === sessionId ? __assign(__assign({}, t), { state: state }) : t;
            }),
        }); });
    },
    updateTabCost: function (sessionId, cost) {
        return set(function (s) { return ({
            tabs: s.tabs.map(function (t) {
                return t.sessionId === sessionId ? __assign(__assign({}, t), { totalCost: cost }) : t;
            }),
        }); });
    },
    setConversationId: function (sessionId, conversationId) {
        return set(function (s) { return ({
            tabs: s.tabs.map(function (t) {
                return t.sessionId === sessionId ? __assign(__assign({}, t), { conversationId: conversationId }) : t;
            }),
        }); });
    },
    setModel: function (sessionId, model) {
        return set(function (s) { return ({
            tabs: s.tabs.map(function (t) {
                return t.sessionId === sessionId ? __assign(__assign({}, t), { model: model }) : t;
            }),
        }); });
    },
    updateTabMeta: function (sessionId, patch) {
        return set(function (s) { return ({
            tabs: s.tabs.map(function (t) {
                return t.sessionId === sessionId ? __assign(__assign({}, t), patch) : t;
            }),
        }); });
    },
    updateTabMode: function (sessionId, mode) {
        return set(function (s) { return ({
            tabs: s.tabs.map(function (t) {
                return t.sessionId === sessionId ? __assign(__assign({}, t), { mode: mode }) : t;
            }),
        }); });
    },
    toggleMessageCollapsed: function (sessionId, messageId) {
        return set(function (s) {
            var _a;
            var messages = getMessagesForSession(s.messagesBySession, sessionId);
            return {
                messagesBySession: __assign(__assign({}, s.messagesBySession), (_a = {}, _a[sessionId] = messages.map(function (message) {
                    return message.id === messageId
                        ? __assign(__assign({}, message), { collapsed: !message.collapsed }) : message;
                }), _a)),
            };
        });
    },
    toggleReasoningCollapsed: function (sessionId, messageId) {
        return set(function (s) {
            var _a;
            var messages = getMessagesForSession(s.messagesBySession, sessionId);
            return {
                messagesBySession: __assign(__assign({}, s.messagesBySession), (_a = {}, _a[sessionId] = messages.map(function (message) {
                    return message.id === messageId
                        ? __assign(__assign({}, message), { reasoningCollapsed: !message.reasoningCollapsed }) : message;
                }), _a)),
            };
        });
    },
    finalizeAllPending: function (sessionId) {
        return set(function (s) {
            var _a;
            var messages = getMessagesForSession(s.messagesBySession, sessionId);
            var changed = false;
            var next = messages.map(function (message) {
                if (message.streamState === "pending" ||
                    message.streamState === "streaming") {
                    changed = true;
                    return __assign(__assign({}, message), { streamState: "completed" });
                }
                return message;
            });
            return changed
                ? { messagesBySession: __assign(__assign({}, s.messagesBySession), (_a = {}, _a[sessionId] = next, _a)) }
                : s;
        });
    },
    clearMessages: function (sessionId) {
        return set(function (s) {
            var _a;
            return ({
                messagesBySession: __assign(__assign({}, s.messagesBySession), (_a = {}, _a[sessionId] = [], _a)),
            });
        });
    },
    clearPlanReview: function (sessionId) {
        return set(function (s) { return ({
            tabs: s.tabs.map(function (tab) {
                return tab.sessionId === sessionId ? __assign(__assign({}, tab), { planReview: null }) : tab;
            }),
        }); });
    },
}); });
