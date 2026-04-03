"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentSelector = AgentSelector;
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var dropdown_menu_1 = require("@/components/ui/dropdown-menu");
function AgentSelector(_a) {
    var _b;
    var clis = _a.clis, selected = _a.selected, onSelect = _a.onSelect, disabled = _a.disabled;
    var selectedCli = clis.find(function (c) { return c.name === selected; });
    return (<dropdown_menu_1.DropdownMenu>
      <dropdown_menu_1.DropdownMenuTrigger disabled={disabled || clis.length === 0} className={(0, utils_1.cn)("flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors", "text-muted-foreground hover:text-foreground", "disabled:opacity-50 disabled:cursor-not-allowed")}>
        <lucide_react_1.Terminal className="h-3.5 w-3.5 shrink-0"/>
        <span className="truncate max-w-[140px]">
          {(_b = selectedCli === null || selectedCli === void 0 ? void 0 : selectedCli.displayName) !== null && _b !== void 0 ? _b : "Select agent..."}
        </span>
        <lucide_react_1.ChevronDown className="h-3 w-3 shrink-0"/>
      </dropdown_menu_1.DropdownMenuTrigger>
      <dropdown_menu_1.DropdownMenuContent align="start" className="min-w-[180px]">
        {clis.map(function (cli) { return (<dropdown_menu_1.DropdownMenuItem key={cli.name} onClick={function () { return onSelect(cli.name); }} className={(0, utils_1.cn)("flex items-center gap-2", cli.name === selected && "bg-accent")}>
            <lucide_react_1.Terminal className="h-3.5 w-3.5 shrink-0 text-muted-foreground"/>
            <div className="flex-1 min-w-0">
              <span className="text-sm">{cli.displayName}</span>
              {cli.version && (<span className="ml-1.5 text-xs text-muted-foreground">v{cli.version}</span>)}
            </div>
          </dropdown_menu_1.DropdownMenuItem>); })}
      </dropdown_menu_1.DropdownMenuContent>
    </dropdown_menu_1.DropdownMenu>);
}
