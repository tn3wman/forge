"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkModeSelector = WorkModeSelector;
var lucide_react_1 = require("lucide-react");
var dropdown_menu_1 = require("@/components/ui/dropdown-menu");
var utils_1 = require("@/lib/utils");
var MODE_OPTIONS = [
    { value: "local", label: "Local", icon: lucide_react_1.FolderOpen },
    { value: "new-worktree", label: "New worktree", icon: lucide_react_1.GitBranch },
    { value: "existing-worktree", label: "Existing worktree", icon: lucide_react_1.GitBranch },
];
function WorkModeSelector(_a) {
    var _b, _c, _d;
    var workMode = _a.workMode, onWorkModeChange = _a.onWorkModeChange, currentBranch = _a.currentBranch, branches = _a.branches, branchesLoading = _a.branchesLoading, selectedBranch = _a.selectedBranch, onBranchChange = _a.onBranchChange, worktrees = _a.worktrees, worktreesLoading = _a.worktreesLoading, selectedWorktree = _a.selectedWorktree, onWorktreeChange = _a.onWorktreeChange, onUnlockWorktree = _a.onUnlockWorktree, disabled = _a.disabled;
    var nonMainWorktrees = worktrees.filter(function (wt) { return !wt.isMain; });
    var hasExistingWorktrees = nonMainWorktrees.length > 0;
    var currentMode = (_b = MODE_OPTIONS.find(function (o) { return o.value === workMode; })) !== null && _b !== void 0 ? _b : MODE_OPTIONS[0];
    var ModeIcon = currentMode.icon;
    // All modes always shown; "existing worktree" disabled when none exist
    var availableModes = MODE_OPTIONS;
    // Right-side label depends on mode
    var rightLabel;
    var rightLoading = false;
    switch (workMode) {
        case "local":
            rightLabel = currentBranch !== null && currentBranch !== void 0 ? currentBranch : "detached";
            rightLoading = branchesLoading !== null && branchesLoading !== void 0 ? branchesLoading : false;
            break;
        case "new-worktree":
            rightLabel = selectedBranch ? "From ".concat(selectedBranch) : "Select branch";
            rightLoading = branchesLoading !== null && branchesLoading !== void 0 ? branchesLoading : false;
            break;
        case "existing-worktree":
            rightLabel = (_d = (_c = selectedWorktree === null || selectedWorktree === void 0 ? void 0 : selectedWorktree.branch) !== null && _c !== void 0 ? _c : selectedWorktree === null || selectedWorktree === void 0 ? void 0 : selectedWorktree.name) !== null && _d !== void 0 ? _d : "Select worktree";
            rightLoading = worktreesLoading !== null && worktreesLoading !== void 0 ? worktreesLoading : false;
            break;
    }
    return (<div className="flex items-center justify-between px-5 pb-3">
      {/* Left: Work mode dropdown */}
      <dropdown_menu_1.DropdownMenu>
        <dropdown_menu_1.DropdownMenuTrigger disabled={disabled} className="flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
          <ModeIcon className="h-3.5 w-3.5"/>
          <span className="font-medium">{currentMode.label}</span>
          <lucide_react_1.ChevronDown className="h-3 w-3"/>
        </dropdown_menu_1.DropdownMenuTrigger>
        <dropdown_menu_1.DropdownMenuContent align="start">
          {availableModes.map(function (option, idx) {
            var isExistingWt = option.value === "existing-worktree";
            var isDisabled = isExistingWt && !hasExistingWorktrees;
            return (<div key={option.value}>
                {idx > 0 && isExistingWt && <dropdown_menu_1.DropdownMenuSeparator />}
                <dropdown_menu_1.DropdownMenuItem onClick={function () { return !isDisabled && onWorkModeChange(option.value); }} disabled={isDisabled} className={(0, utils_1.cn)(workMode === option.value && "bg-accent", isDisabled && "opacity-50")}>
                  <option.icon className="mr-2 h-3.5 w-3.5"/>
                  {option.label}
                  {isDisabled && (<span className="ml-1.5 text-[10px] text-muted-foreground/50">
                      (none)
                    </span>)}
                </dropdown_menu_1.DropdownMenuItem>
              </div>);
        })}
        </dropdown_menu_1.DropdownMenuContent>
      </dropdown_menu_1.DropdownMenu>

      {/* Right: Branch / worktree context */}
      {rightLoading ? (<div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground/60">
          <lucide_react_1.Loader2 className="h-3 w-3 animate-spin"/>
        </div>) : workMode === "local" ? (
        // Local mode: read-only branch indicator
        <span className="text-xs text-muted-foreground/70 font-medium">
          {rightLabel}
        </span>) : workMode === "new-worktree" ? (
        // New worktree mode: branch selector
        <dropdown_menu_1.DropdownMenu>
          <dropdown_menu_1.DropdownMenuTrigger disabled={disabled} className="flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
            <span className="font-medium">{rightLabel}</span>
            <lucide_react_1.ChevronDown className="h-3 w-3"/>
          </dropdown_menu_1.DropdownMenuTrigger>
          <dropdown_menu_1.DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
            {branches.map(function (branch) { return (<dropdown_menu_1.DropdownMenuItem key={"".concat(branch.isRemote ? "r" : "l", "-").concat(branch.name)} onClick={function () { return onBranchChange(branch.name); }} className={(0, utils_1.cn)(selectedBranch === branch.name && "bg-accent", branch.isRemote && "text-muted-foreground")}>
                {branch.isRemote ? (<span className="text-muted-foreground/60 mr-1">remote/</span>) : null}
                {branch.name}
                {branch.isHead && (<span className="ml-2 text-muted-foreground/50 text-[10px]">HEAD</span>)}
              </dropdown_menu_1.DropdownMenuItem>); })}
          </dropdown_menu_1.DropdownMenuContent>
        </dropdown_menu_1.DropdownMenu>) : (
        // Existing worktree mode: worktree selector
        <dropdown_menu_1.DropdownMenu>
          <dropdown_menu_1.DropdownMenuTrigger disabled={disabled || nonMainWorktrees.length === 0} className="flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
            <span className="font-medium">{rightLabel}</span>
            <lucide_react_1.ChevronDown className="h-3 w-3"/>
          </dropdown_menu_1.DropdownMenuTrigger>
          <dropdown_menu_1.DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
            {nonMainWorktrees.map(function (wt) {
                var _a;
                return (<dropdown_menu_1.DropdownMenuItem key={wt.name} onClick={function () {
                        return wt.isLocked && onUnlockWorktree
                            ? onUnlockWorktree(wt)
                            : onWorktreeChange(wt);
                    }} className={(0, utils_1.cn)((selectedWorktree === null || selectedWorktree === void 0 ? void 0 : selectedWorktree.name) === wt.name && "bg-accent", wt.isLocked && "opacity-60")}>
                <lucide_react_1.GitBranch className="mr-2 h-3.5 w-3.5"/>
                {(_a = wt.branch) !== null && _a !== void 0 ? _a : wt.name}
                {wt.isLocked && (<span className="ml-2 inline-flex items-center gap-1 text-muted-foreground/50 text-[10px]">
                    <lucide_react_1.LockOpen className="h-2.5 w-2.5"/>
                    unlock
                  </span>)}
              </dropdown_menu_1.DropdownMenuItem>);
            })}
          </dropdown_menu_1.DropdownMenuContent>
        </dropdown_menu_1.DropdownMenu>)}
    </div>);
}
