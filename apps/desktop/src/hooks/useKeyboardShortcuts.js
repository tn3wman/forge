"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useKeyboardShortcuts = useKeyboardShortcuts;
var react_1 = require("react");
function useKeyboardShortcuts(shortcuts) {
    var shortcutsRef = (0, react_1.useRef)(shortcuts);
    shortcutsRef.current = shortcuts;
    (0, react_1.useEffect)(function () {
        var gPressed = false;
        var timeout;
        function handleKeyDown(e) {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
                return;
            // Handle combo shortcuts (e.g. Escape, Cmd+K)
            for (var _i = 0, _a = shortcutsRef.current; _i < _a.length; _i++) {
                var s = _a[_i];
                if (s.mode !== "combo" || s.enabled === false)
                    continue;
                if (s.key === "Escape" && e.key === "Escape") {
                    s.action();
                    return;
                }
                var metaMatch = s.meta ? (e.metaKey || e.ctrlKey) : true;
                var shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
                if (metaMatch && shiftMatch && e.key === s.key && s.key !== "Escape") {
                    e.preventDefault();
                    s.action();
                    return;
                }
            }
            // Sequence mode: G + key
            if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
                gPressed = true;
                clearTimeout(timeout);
                timeout = setTimeout(function () { gPressed = false; }, 500);
                return;
            }
            if (gPressed) {
                gPressed = false;
                for (var _b = 0, _c = shortcutsRef.current; _b < _c.length; _b++) {
                    var s = _c[_b];
                    if (s.mode === "sequence" && s.sequenceKey === e.key && s.enabled !== false) {
                        e.preventDefault();
                        s.action();
                        return;
                    }
                }
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return function () {
            window.removeEventListener("keydown", handleKeyDown);
            clearTimeout(timeout);
        };
    }, []);
}
