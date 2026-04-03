"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MergeButton = MergeButton;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var button_1 = require("@/components/ui/button");
var dropdown_menu_1 = require("@/components/ui/dropdown-menu");
var METHODS = {
    merge: "Create a merge commit",
    squash: "Squash and merge",
    rebase: "Rebase and merge",
};
var METHOD_LABELS = {
    merge: "Merge pull request",
    squash: "Squash and merge",
    rebase: "Rebase and merge",
};
function MergeButton(_a) {
    var mergeable = _a.mergeable, onMerge = _a.onMerge, _b = _a.isMerging, isMerging = _b === void 0 ? false : _b, state = _a.state;
    var _c = (0, react_1.useState)("merge"), selectedMethod = _c[0], setSelectedMethod = _c[1];
    if (state === "merged") {
        return (<div className="inline-flex items-center gap-1.5 rounded-md bg-purple-500/20 px-3 py-1.5 text-sm font-medium text-purple-400">
        <lucide_react_1.GitMerge className="h-4 w-4"/>
        Merged
      </div>);
    }
    if (state === "closed") {
        return (<div className="inline-flex items-center gap-1.5 rounded-md bg-red-500/20 px-3 py-1.5 text-sm font-medium text-red-400">
        Closed
      </div>);
    }
    if (mergeable === "CONFLICTING") {
        return (<div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 text-sm text-yellow-400">
          <lucide_react_1.AlertTriangle className="h-4 w-4"/>
          This branch has conflicts that must be resolved
        </div>
        <button_1.Button size="sm" disabled>
          Merge pull request
        </button_1.Button>
      </div>);
    }
    var canMerge = mergeable === "MERGEABLE";
    return (<div className="inline-flex items-center">
      <button_1.Button size="sm" disabled={!canMerge || isMerging} onClick={function () { return onMerge(selectedMethod); }} className="rounded-r-none">
        {isMerging ? "Merging..." : METHOD_LABELS[selectedMethod]}
      </button_1.Button>
      <dropdown_menu_1.DropdownMenu>
        <dropdown_menu_1.DropdownMenuTrigger asChild>
          <button_1.Button size="sm" disabled={!canMerge || isMerging} className={(0, utils_1.cn)("rounded-l-none border-l border-primary-foreground/20 px-2")}>
            <lucide_react_1.ChevronDown className="h-3.5 w-3.5"/>
          </button_1.Button>
        </dropdown_menu_1.DropdownMenuTrigger>
        <dropdown_menu_1.DropdownMenuContent align="end">
          {Object.entries(METHODS).map(function (_a) {
            var key = _a[0], label = _a[1];
            return (<dropdown_menu_1.DropdownMenuItem key={key} onClick={function () { return setSelectedMethod(key); }} className={(0, utils_1.cn)(key === selectedMethod && "bg-accent")}>
              {label}
            </dropdown_menu_1.DropdownMenuItem>);
        })}
        </dropdown_menu_1.DropdownMenuContent>
      </dropdown_menu_1.DropdownMenu>
    </div>);
}
