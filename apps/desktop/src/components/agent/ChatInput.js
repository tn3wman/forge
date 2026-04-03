"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatInput = ChatInput;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var SlashCommandMenu_1 = require("./SlashCommandMenu");
var MODE_COMMANDS = {
    supervised: "supervised",
    assisted: "assisted",
    full: "fullAccess",
    yolo: "fullAccess",
};
function ChatInput(_a) {
    var onSend = _a.onSend, onAbort = _a.onAbort, agentState = _a.agentState, disabled = _a.disabled, onModeChange = _a.onModeChange, onClear = _a.onClear, onFocusChange = _a.onFocusChange, _b = _a.slashCommands, slashCommands = _b === void 0 ? [] : _b;
    var _c = (0, react_1.useState)(""), text = _c[0], setText = _c[1];
    var _d = (0, react_1.useState)(null), confirmation = _d[0], setConfirmation = _d[1];
    var _e = (0, react_1.useState)(false), slashMenuDismissed = _e[0], setSlashMenuDismissed = _e[1];
    var textareaRef = (0, react_1.useRef)(null);
    var isRunning = agentState === "thinking" || agentState === "executing";
    var showSlashMenu = text.startsWith("/") && !text.includes(" ") && !slashMenuDismissed;
    var slashFilter = text.slice(1);
    // Reset dismissed state when text changes away from slash
    (0, react_1.useEffect)(function () {
        if (!text.startsWith("/")) {
            setSlashMenuDismissed(false);
        }
    }, [text]);
    var adjustHeight = (0, react_1.useCallback)(function () {
        var el = textareaRef.current;
        if (!el)
            return;
        el.style.height = "auto";
        el.style.height = "".concat(Math.min(el.scrollHeight, 200), "px");
    }, []);
    (0, react_1.useEffect)(function () {
        adjustHeight();
    }, [text, adjustHeight]);
    var showConfirmationMsg = (0, react_1.useCallback)(function (msg) {
        setConfirmation(msg);
        setTimeout(function () { return setConfirmation(null); }, 1000);
    }, []);
    var handleCommandSelect = (0, react_1.useCallback)(function (cmd) {
        if (cmd.category === "local") {
            switch (cmd.name) {
                case "clear":
                    onClear === null || onClear === void 0 ? void 0 : onClear();
                    showConfirmationMsg("Messages cleared");
                    break;
                case "abort":
                    onAbort();
                    break;
                default: {
                    var mode = MODE_COMMANDS[cmd.name];
                    if (mode) {
                        onModeChange === null || onModeChange === void 0 ? void 0 : onModeChange(mode);
                        showConfirmationMsg("Mode changed to ".concat(mode));
                    }
                }
            }
        }
        else {
            onSend("/".concat(cmd.name));
        }
        setText("");
    }, [onClear, onAbort, onModeChange, onSend, showConfirmationMsg]);
    var handleSend = (0, react_1.useCallback)(function () {
        var trimmed = text.trim();
        if (!trimmed)
            return;
        var lower = trimmed.toLowerCase();
        if (lower === "/clear") {
            onClear === null || onClear === void 0 ? void 0 : onClear();
            setText("");
            showConfirmationMsg("Messages cleared");
            return;
        }
        if (lower === "/abort") {
            onAbort();
            setText("");
            return;
        }
        var modeCmd = MODE_COMMANDS[lower.slice(1)];
        if (lower.startsWith("/") && modeCmd) {
            onModeChange === null || onModeChange === void 0 ? void 0 : onModeChange(modeCmd);
            setText("");
            showConfirmationMsg("Mode changed to ".concat(modeCmd));
            return;
        }
        // Normal message (including unknown slash commands)
        onSend(trimmed);
        setText("");
    }, [text, onSend, onAbort, onModeChange, onClear, showConfirmationMsg]);
    var handleKeyDown = (0, react_1.useCallback)(function (e) {
        if (e.key === "Escape") {
            if (showSlashMenu) {
                e.preventDefault();
                setSlashMenuDismissed(true);
                return;
            }
            if (isRunning) {
                e.preventDefault();
                onAbort();
            }
            return;
        }
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend, isRunning, onAbort, showSlashMenu]);
    return (<div className="relative flex items-end gap-2 border-t border-border bg-background px-3 py-2">
      {confirmation && (<div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground animate-in fade-in zoom-in duration-150">
          {confirmation}
        </div>)}
      <SlashCommandMenu_1.SlashCommandMenu filter={slashFilter} commands={slashCommands} onSelect={handleCommandSelect} onDismiss={function () { return setSlashMenuDismissed(true); }} visible={showSlashMenu}/>
      <textarea ref={textareaRef} value={text} onChange={function (e) { return setText(e.target.value); }} onKeyDown={handleKeyDown} onFocus={function () { return onFocusChange === null || onFocusChange === void 0 ? void 0 : onFocusChange(true); }} onBlur={function () { return onFocusChange === null || onFocusChange === void 0 ? void 0 : onFocusChange(false); }} rows={1} disabled={disabled} placeholder={isRunning ? "Agent is working..." : "Message... (\u2318+Enter to send)"} className={(0, utils_1.cn)("flex-1 resize-none rounded-md border border-border bg-muted/50 px-3 py-2 text-sm", "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring", disabled && "opacity-50 cursor-not-allowed")}/>
      {isRunning ? (<button type="button" onClick={onAbort} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-700">
          <lucide_react_1.Square className="h-4 w-4"/>
        </button>) : (<button type="button" onClick={handleSend} disabled={!text.trim() || disabled} className={(0, utils_1.cn)("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", text.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed")}>
          <lucide_react_1.Send className="h-4 w-4"/>
        </button>)}
    </div>);
}
