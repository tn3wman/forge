"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.terminalIpc = void 0;
var core_1 = require("@tauri-apps/api/core");
exports.terminalIpc = {
    discoverClis: function () { return (0, core_1.invoke)("terminal_discover_clis"); },
    createSession: function (request) {
        return (0, core_1.invoke)("terminal_create_session", { request: request });
    },
    listSessions: function () { return (0, core_1.invoke)("terminal_list_sessions"); },
    write: function (sessionId, data) {
        return (0, core_1.invoke)("terminal_write", { sessionId: sessionId, data: Array.from(data) });
    },
    resize: function (sessionId, cols, rows) {
        return (0, core_1.invoke)("terminal_resize", { sessionId: sessionId, cols: cols, rows: rows });
    },
    kill: function (sessionId) { return (0, core_1.invoke)("terminal_kill", { sessionId: sessionId }); },
};
