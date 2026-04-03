"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentStatusBar = AgentStatusBar;
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var stateConfig = {
    idle: { label: "Ready", icon: lucide_react_1.Check },
    thinking: { label: "Thinking", icon: lucide_react_1.Brain, spin: true },
    executing: { label: "Executing", icon: lucide_react_1.Wrench, spin: true },
    awaiting_approval: { label: "Awaiting Approval", icon: lucide_react_1.AlertTriangle },
    completed: { label: "Completed", icon: lucide_react_1.Check },
    error: { label: "Error", icon: lucide_react_1.AlertTriangle },
};
var PERMISSION_LABELS = {
    supervised: "Supervised",
    assisted: "Assisted",
    fullAccess: "Full Access",
};
var EFFORT_LABELS = {
    low: "Low effort",
    medium: "Medium effort",
    high: "High effort",
};
function formatModel(model) {
    return model
        .replace("claude-", "Claude ")
        .replace("opus-4-6", "Opus 4.6")
        .replace("sonnet-4-6", "Sonnet 4.6")
        .replace("haiku-4-5", "Haiku 4.5")
        .replace("[1m]", "")
        .replace("[1M]", "")
        .replace(/\[.*?\]$/, "")
        .trim();
}
function AgentStatusBar(_a) {
    var _b, _c, _d;
    var state = _a.state, model = _a.model, permissionMode = _a.permissionMode, agent = _a.agent, effort = _a.effort, totalCost = _a.totalCost, planMode = _a.planMode;
    var config = (_b = stateConfig[state]) !== null && _b !== void 0 ? _b : stateConfig.idle;
    var label = planMode && state === "awaiting_approval" ? "Plan Ready for Review" : config.label;
    var Icon = config.icon, spin = config.spin;
    var details = [];
    if (planMode)
        details.push("Plan");
    if (model)
        details.push(formatModel(model));
    if (permissionMode)
        details.push((_c = PERMISSION_LABELS[permissionMode]) !== null && _c !== void 0 ? _c : permissionMode);
    if (agent)
        details.push(agent);
    if (effort)
        details.push((_d = EFFORT_LABELS[effort]) !== null && _d !== void 0 ? _d : effort);
    return (<div className="mx-4 mb-1.5 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <Icon className={(0, utils_1.cn)("h-3.5 w-3.5", spin && "animate-spin")}/>
        <span>{label}</span>
        {details.length > 0 && (<>
            <lucide_react_1.Dot className="h-4 w-4 text-muted-foreground/40"/>
            <span>{details.join(" \u00b7 ")}</span>
          </>)}
      </div>
      <span className="font-mono tabular-nums">${(totalCost !== null && totalCost !== void 0 ? totalCost : 0).toFixed(4)}</span>
    </div>);
}
