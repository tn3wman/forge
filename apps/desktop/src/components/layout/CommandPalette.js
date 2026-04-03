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
exports.CommandPalette = CommandPalette;
var command_1 = require("@/components/ui/command");
function CommandPalette(_a) {
    var _b;
    var open = _a.open, onOpenChange = _a.onOpenChange, shortcuts = _a.shortcuts;
    if (!open)
        return null;
    // Group shortcuts by category, skip disabled ones
    var groups = new Map();
    for (var _i = 0, shortcuts_1 = shortcuts; _i < shortcuts_1.length; _i++) {
        var s = shortcuts_1[_i];
        if (s.enabled === false)
            continue;
        var cat = (_b = s.category) !== null && _b !== void 0 ? _b : "General";
        if (!groups.has(cat))
            groups.set(cat, []);
        groups.get(cat).push(s);
    }
    function handleSelect(shortcut) {
        shortcut.action();
        onOpenChange(false);
    }
    return (<div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/50" onClick={function () { return onOpenChange(false); }}/>
      <command_1.Command className="relative w-full max-w-lg rounded-lg border bg-popover shadow-lg" onKeyDown={function (e) {
            if (e.key === "Escape") {
                e.preventDefault();
                onOpenChange(false);
            }
        }}>
        <command_1.CommandInput placeholder="Type a command or search..." autoFocus/>
        <command_1.CommandList>
          <command_1.CommandEmpty>No results found.</command_1.CommandEmpty>
          {__spreadArray([], groups.entries(), true).map(function (_a) {
            var category = _a[0], items = _a[1];
            return (<command_1.CommandGroup key={category} heading={category}>
              {items.map(function (s) { return (<command_1.CommandItem key={s.label} onSelect={function () { return handleSelect(s); }}>
                  {s.label}
                  <command_1.CommandShortcut>{s.keys}</command_1.CommandShortcut>
                </command_1.CommandItem>); })}
            </command_1.CommandGroup>);
        })}
        </command_1.CommandList>
      </command_1.Command>
    </div>);
}
