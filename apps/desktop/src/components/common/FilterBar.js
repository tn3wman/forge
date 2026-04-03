"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterBar = FilterBar;
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var input_1 = require("@/components/ui/input");
function FilterBar(_a) {
    var filters = _a.filters, activeFilter = _a.activeFilter, onFilterChange = _a.onFilterChange, searchQuery = _a.searchQuery, onSearchChange = _a.onSearchChange, _b = _a.searchPlaceholder, searchPlaceholder = _b === void 0 ? "Search..." : _b;
    return (<div className="flex items-center gap-2 px-3 py-2 border-b border-border">
      <div className="flex items-center gap-1">
        {filters.map(function (filter) { return (<button key={filter.value} onClick={function () { return onFilterChange(filter.value); }} className={(0, utils_1.cn)("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors", activeFilter === filter.value
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")}>
            {filter.label}
            {filter.count != null && (<span className={(0, utils_1.cn)("tabular-nums text-[10px]", activeFilter === filter.value
                    ? "text-accent-foreground/70"
                    : "text-muted-foreground/60")}>
                {filter.count}
              </span>)}
          </button>); })}
      </div>
      {onSearchChange && (<div className="relative ml-auto">
          <lucide_react_1.Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/>
          <input_1.Input value={searchQuery !== null && searchQuery !== void 0 ? searchQuery : ""} onChange={function (e) { return onSearchChange(e.target.value); }} placeholder={searchPlaceholder} className="h-7 w-48 pl-7 text-xs"/>
        </div>)}
    </div>);
}
