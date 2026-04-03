"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModeSelector = ModeSelector;
var utils_1 = require("@/lib/utils");
var modes = [
    { value: "supervised", label: "Supervised" },
    { value: "assisted", label: "Assisted" },
    { value: "fullAccess", label: "Full Access" },
];
function ModeSelector(_a) {
    var value = _a.value, onChange = _a.onChange;
    return (<div className="flex gap-0.5 rounded-lg bg-muted p-0.5">
      {modes.map(function (mode) { return (<button key={mode.value} type="button" onClick={function () { return onChange(mode.value); }} className={(0, utils_1.cn)("rounded-md px-2.5 py-1 text-xs font-medium transition-colors", value === mode.value
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground")}>
          {mode.label}
        </button>); })}
    </div>);
}
