"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalView = TerminalView;
var react_1 = require("react");
var xterm_1 = require("@xterm/xterm");
var addon_fit_1 = require("@xterm/addon-fit");
var addon_webgl_1 = require("@xterm/addon-webgl");
require("@xterm/xterm/css/xterm.css");
var useTerminalSession_1 = require("@/hooks/useTerminalSession");
var workspaceStore_1 = require("@/stores/workspaceStore");
function TerminalView(_a) {
    var sessionId = _a.sessionId, isActive = _a.isActive, alwaysVisible = _a.alwaysVisible, onExit = _a.onExit;
    var containerRef = (0, react_1.useRef)(null);
    var _b = (0, react_1.useState)(null), terminal = _b[0], setTerminal = _b[1];
    var fitAddonRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        var container = containerRef.current;
        if (!container)
            return;
        var term = new xterm_1.Terminal({
            cursorBlink: true,
            fontSize: 13,
            fontFamily: "'Geist Mono', 'SF Mono', 'Monaco', 'Menlo', monospace",
            theme: {
                background: "#09090b",
                foreground: "#fafafa",
                cursor: "#fafafa",
                selectionBackground: "#27272a",
                black: "#09090b",
                red: "#ef4444",
                green: "#22c55e",
                yellow: "#eab308",
                blue: "#3b82f6",
                magenta: "#a855f7",
                cyan: "#06b6d4",
                white: "#fafafa",
                brightBlack: "#71717a",
                brightRed: "#f87171",
                brightGreen: "#4ade80",
                brightYellow: "#facc15",
                brightBlue: "#60a5fa",
                brightMagenta: "#c084fc",
                brightCyan: "#22d3ee",
                brightWhite: "#ffffff",
            },
        });
        var fitAddon = new addon_fit_1.FitAddon();
        term.loadAddon(fitAddon);
        fitAddonRef.current = fitAddon;
        term.open(container);
        // Wait one frame for layout to stabilize before fitting and loading WebGL.
        // Defer setTerminal so useTerminalSession doesn't attach listeners until
        // the terminal is properly sized — early PTY output buffers in Tauri events.
        var rafId = requestAnimationFrame(function () {
            fitAddon.fit();
            try {
                term.loadAddon(new addon_webgl_1.WebglAddon());
            }
            catch ( /* fallback to canvas */_a) { /* fallback to canvas */ }
            setTerminal(term);
        });
        return function () {
            cancelAnimationFrame(rafId);
            term.dispose();
        };
    }, []);
    (0, useTerminalSession_1.useTerminalSession)(sessionId, terminal, onExit);
    (0, react_1.useEffect)(function () {
        var container = containerRef.current;
        var fitAddon = fitAddonRef.current;
        if (!container || !fitAddon)
            return;
        var rafId = null;
        var observer = new ResizeObserver(function () {
            if (rafId !== null)
                cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(function () {
                try {
                    fitAddon.fit();
                }
                catch ( /* ignore */_a) { /* ignore */ }
                rafId = null;
            });
        });
        observer.observe(container);
        return function () {
            if (rafId !== null)
                cancelAnimationFrame(rafId);
            observer.disconnect();
        };
    }, []);
    // Refit terminal when it becomes active or when home page becomes visible
    var isHomePage = (0, workspaceStore_1.useWorkspaceStore)(function (s) { return s.activePage === "home"; });
    (0, react_1.useEffect)(function () {
        if (isActive && isHomePage) {
            var id_1 = requestAnimationFrame(function () {
                var _a;
                (_a = fitAddonRef.current) === null || _a === void 0 ? void 0 : _a.fit();
                terminal === null || terminal === void 0 ? void 0 : terminal.focus();
            });
            return function () { return cancelAnimationFrame(id_1); };
        }
    }, [isActive, isHomePage, terminal]);
    return (<div ref={containerRef} className="h-full w-full" style={{ display: alwaysVisible || isActive ? "block" : "none" }}/>);
}
