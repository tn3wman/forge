"use strict";
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
exports.LOCAL_COMMANDS = void 0;
exports.SlashCommandMenu = SlashCommandMenu;
var react_1 = require("react");
var command_1 = require("@/components/ui/command");
/** Local-only commands handled by the app, not sent to the agent */
exports.LOCAL_COMMANDS = [
    { name: "clear", description: "Clear chat history", category: "local" },
    { name: "abort", description: "Stop the running agent", category: "local" },
    { name: "plan", description: "Toggle Plan mode on", category: "local" },
    { name: "default", description: "Toggle Plan mode off", category: "local" },
    { name: "yolo", description: "Switch to BypassPermissions mode", category: "local" },
    { name: "auto", description: "Switch to Auto mode", category: "local" },
];
function SlashCommandMenu(_a) {
    var _b;
    var filter = _a.filter, commands = _a.commands, onSelect = _a.onSelect, onDismiss = _a.onDismiss, visible = _a.visible;
    var ref = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        if (!visible)
            return;
        var handler = function (e) {
            if (ref.current && !ref.current.contains(e.target)) {
                onDismiss();
            }
        };
        document.addEventListener("mousedown", handler);
        return function () { return document.removeEventListener("mousedown", handler); };
    }, [visible, onDismiss]);
    if (!visible)
        return null;
    var allCommands = __spreadArray(__spreadArray([], exports.LOCAL_COMMANDS, true), commands, true);
    var grouped = {};
    for (var _i = 0, allCommands_1 = allCommands; _i < allCommands_1.length; _i++) {
        var cmd = allCommands_1[_i];
        var group = cmd.category === "local" ? "App" :
            cmd.category === "builtin" ? "Agent" :
                cmd.category === "skill" ? "Skills" : "Other";
        ((_b = grouped[group]) !== null && _b !== void 0 ? _b : (grouped[group] = [])).push(cmd);
    }
    var categoryLabels = ["App", "Agent", "Skills", "Other"];
    return (<div ref={ref} className="absolute bottom-full left-0 right-0 mb-1 z-50">
      <command_1.Command filter={function (value, search) {
            if (value.includes(search.toLowerCase()))
                return 1;
            return 0;
        }} className="rounded-lg border border-border bg-popover shadow-lg max-h-[280px]">
        <command_1.CommandList>
          <command_1.CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
            No commands found
          </command_1.CommandEmpty>
          {categoryLabels.map(function (label) {
            var items = grouped[label];
            if (!(items === null || items === void 0 ? void 0 : items.length))
                return null;
            return (<command_1.CommandGroup key={label} heading={label}>
                {items.map(function (cmd) { return (<command_1.CommandItem key={cmd.name} value={cmd.name} onSelect={function () { return onSelect(cmd); }} className="flex items-center gap-2 px-2 py-1.5">
                    <span className="font-mono text-xs text-foreground">
                      /{cmd.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {cmd.description}
                    </span>
                    {cmd.source && (<span className="ml-auto text-[10px] text-muted-foreground/60 shrink-0">
                        {cmd.source}
                      </span>)}
                  </command_1.CommandItem>); })}
              </command_1.CommandGroup>);
        })}
        </command_1.CommandList>
      </command_1.Command>
    </div>);
}
