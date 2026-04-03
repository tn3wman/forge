"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNextSeq = getNextSeq;
exports.initSeqCounter = initSeqCounter;
exports.clearSeqCounter = clearSeqCounter;
exports.toPersisted = toPersisted;
exports.fromPersisted = fromPersisted;
exports.persistMessagesForSession = persistMessagesForSession;
exports.persistSingleMessage = persistSingleMessage;
exports.sessionInfoToPersistedSession = sessionInfoToPersistedSession;
var agent_1 = require("@/ipc/agent");
// Track sequence numbers per session (module-level, not in store)
var seqCounters = new Map();
function getNextSeq(sessionId) {
    var _a;
    var current = (_a = seqCounters.get(sessionId)) !== null && _a !== void 0 ? _a : 0;
    var next = current + 1;
    seqCounters.set(sessionId, next);
    return next;
}
function initSeqCounter(sessionId, maxSeq) {
    seqCounters.set(sessionId, maxSeq);
}
function clearSeqCounter(sessionId) {
    seqCounters.delete(sessionId);
}
function toPersisted(msg, sessionId, seq) {
    var _a, _b, _c;
    return {
        id: msg.id,
        sessionId: sessionId,
        seq: seq,
        type: msg.type,
        content: (_a = msg.content) !== null && _a !== void 0 ? _a : "",
        reasoning: msg.reasoning || undefined,
        messageId: msg.messageId,
        turnId: msg.turnId,
        toolUseId: msg.toolUseId,
        toolName: msg.toolName,
        toolInput: (_b = msg.toolInputText) !== null && _b !== void 0 ? _b : (msg.toolInput ? JSON.stringify(msg.toolInput) : undefined),
        toolStatus: msg.toolStatus,
        detail: msg.detail,
        approvalId: msg.approvalId,
        resolved: msg.resolved,
        isError: msg.isError,
        state: msg.state,
        streamState: (_c = msg.streamState) !== null && _c !== void 0 ? _c : "completed",
        reasoningState: msg.reasoningState,
        images: msg.images ? JSON.stringify(msg.images) : undefined,
        timestamp: msg.timestamp,
    };
}
function fromPersisted(msg) {
    var toolInput;
    if (msg.toolInput) {
        try {
            var parsed = JSON.parse(msg.toolInput);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                toolInput = parsed;
            }
        }
        catch (_a) {
            // Not valid JSON, skip
        }
    }
    var images;
    if (msg.images) {
        try {
            images = JSON.parse(msg.images);
        }
        catch (_b) {
            // Not valid JSON, skip
        }
    }
    var isToolType = msg.type === "tool_use" || msg.type === "tool_result";
    return {
        id: msg.id,
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
        collapsed: isToolType, // Collapse tool calls on restore
        messageId: msg.messageId,
        turnId: msg.turnId,
        streamState: "completed", // All restored messages are completed
        reasoning: msg.reasoning,
        reasoningState: msg.reasoning ? "completed" : undefined,
        reasoningCollapsed: true, // Collapse reasoning on restore
        toolName: msg.toolName,
        toolInput: toolInput,
        toolInputText: msg.toolInput,
        toolUseId: msg.toolUseId,
        toolStatus: msg.toolStatus,
        detail: msg.detail,
        approvalId: msg.approvalId,
        resolved: msg.resolved,
        isError: msg.isError,
        state: msg.state,
        images: images,
    };
}
function persistMessagesForSession(sessionId, messages) {
    var persisted = [];
    for (var _i = 0, messages_1 = messages; _i < messages_1.length; _i++) {
        var msg = messages_1[_i];
        // Only persist terminal-state messages
        if (msg.streamState === "pending" || msg.streamState === "streaming")
            continue;
        var seq = getNextSeq(sessionId);
        persisted.push(toPersisted(msg, sessionId, seq));
    }
    if (persisted.length > 0) {
        void agent_1.agentIpc.persistMessages(persisted).catch(function (err) {
            console.error("Failed to persist messages:", err);
        });
    }
}
function persistSingleMessage(sessionId, msg) {
    var seq = getNextSeq(sessionId);
    var persisted = toPersisted(msg, sessionId, seq);
    void agent_1.agentIpc.persistMessages([persisted]).catch(function (err) {
        console.error("Failed to persist message:", err);
    });
}
function sessionInfoToPersistedSession(sessionId, workspaceId, cliName, displayName, mode, opts) {
    var _a;
    var now = new Date().toISOString();
    return {
        id: sessionId,
        workspaceId: workspaceId,
        cliName: cliName,
        displayName: displayName,
        mode: mode,
        provider: opts.provider,
        model: opts.model,
        permissionMode: opts.permissionMode,
        agent: opts.agent,
        effort: opts.effort,
        claudePath: opts.claudePath,
        planMode: opts.planMode,
        workingDirectory: opts.workingDirectory,
        conversationId: opts.conversationId,
        totalCost: 0,
        label: displayName,
        createdAt: (_a = opts.createdAt) !== null && _a !== void 0 ? _a : now,
        updatedAt: now,
    };
}
