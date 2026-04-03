"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTerminalSession = useTerminalSession;
var react_1 = require("react");
var event_1 = require("@tauri-apps/api/event");
var terminal_1 = require("@/ipc/terminal");
function useTerminalSession(sessionId, terminal, onExit) {
    var onExitRef = (0, react_1.useRef)(onExit);
    onExitRef.current = onExit;
    (0, react_1.useEffect)(function () {
        if (!sessionId || !terminal)
            return;
        var disposables = [];
        var unlisteners = [];
        unlisteners.push((0, event_1.listen)("terminal-output", function (event) {
            if (event.payload.sessionId === sessionId) {
                terminal.write(new Uint8Array(event.payload.data));
            }
        }));
        unlisteners.push((0, event_1.listen)("terminal-exit", function (event) {
            var _a;
            if (event.payload.sessionId === sessionId) {
                terminal.write("\r\n\x1b[90m[Process exited]\x1b[0m\r\n");
                (_a = onExitRef.current) === null || _a === void 0 ? void 0 : _a.call(onExitRef, event.payload.exitCode);
            }
        }));
        disposables.push(terminal.onData(function (data) {
            var bytes = Array.from(new TextEncoder().encode(data));
            terminal_1.terminalIpc.write(sessionId, bytes).catch(function () { });
        }));
        disposables.push(terminal.onResize(function (_a) {
            var cols = _a.cols, rows = _a.rows;
            terminal_1.terminalIpc.resize(sessionId, cols, rows).catch(function () { });
        }));
        return function () {
            disposables.forEach(function (d) { return d.dispose(); });
            unlisteners.forEach(function (p) { return p.then(function (fn) { return fn(); }); });
        };
    }, [sessionId, terminal]);
}
