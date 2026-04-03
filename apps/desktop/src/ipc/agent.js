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
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentIpc = void 0;
var core_1 = require("@tauri-apps/api/core");
exports.agentIpc = {
    createSession: function (request) {
        return (0, core_1.invoke)("agent_create_session", { request: request });
    },
    sendMessage: function (sessionId, message, images) {
        return (0, core_1.invoke)("agent_send_message", { sessionId: sessionId, message: message, images: (images === null || images === void 0 ? void 0 : images.length) ? images : null });
    },
    respondPermission: function (sessionId, toolUseId, allow) {
        return (0, core_1.invoke)("agent_respond_permission", { sessionId: sessionId, toolUseId: toolUseId, allow: allow });
    },
    updatePermissionMode: function (sessionId, mode) {
        return (0, core_1.invoke)("agent_update_permission_mode", { sessionId: sessionId, mode: mode });
    },
    abort: function (sessionId) {
        return (0, core_1.invoke)("agent_abort", { sessionId: sessionId });
    },
    kill: function (sessionId) {
        return (0, core_1.invoke)("agent_kill", { sessionId: sessionId });
    },
    listSessions: function (workspaceId) {
        return (0, core_1.invoke)("agent_list_sessions", { workspaceId: workspaceId });
    },
    discoverSlashCommands: function (cliName) {
        return (0, core_1.invoke)("agent_discover_slash_commands", { cliName: cliName });
    },
    // Persistence
    loadPersistedSessions: function (workspaceId) {
        return (0, core_1.invoke)("agent_load_persisted_sessions", { workspaceId: workspaceId });
    },
    loadMessages: function (sessionId, offset, limit) {
        return (0, core_1.invoke)("agent_load_messages", { sessionId: sessionId, offset: offset, limit: limit });
    },
    persistSession: function (session) {
        return (0, core_1.invoke)("agent_persist_session", { session: session });
    },
    persistMessages: function (messages) {
        return (0, core_1.invoke)("agent_persist_messages", { messages: messages });
    },
    updatePersistedSessionMeta: function (sessionId, meta) {
        return (0, core_1.invoke)("agent_update_persisted_session_meta", __assign({ sessionId: sessionId }, meta));
    },
    deletePersistedSession: function (sessionId) {
        return (0, core_1.invoke)("agent_delete_persisted_session", { sessionId: sessionId });
    },
};
