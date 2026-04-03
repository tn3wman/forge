"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRepoSelector = AgentRepoSelector;
var lucide_react_1 = require("lucide-react");
var react_1 = require("react");
var utils_1 = require("@/lib/utils");
function AgentRepoSelector(_a) {
    var _b;
    var repos = _a.repos, selectedRepoId = _a.selectedRepoId, onSelect = _a.onSelect;
    var _c = (0, react_1.useState)(false), open = _c[0], setOpen = _c[1];
    var ref = (0, react_1.useRef)(null);
    var selected = (_b = repos.find(function (r) { return r.id === selectedRepoId; })) !== null && _b !== void 0 ? _b : repos[0];
    (0, react_1.useEffect)(function () {
        if (!open)
            return;
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return function () { return document.removeEventListener("mousedown", handleClick); };
    }, [open]);
    if (!selected)
        return null;
    return (<div ref={ref} className="relative flex items-center justify-center px-5 pb-1">
      <button onClick={function () { return setOpen(function (v) { return !v; }); }} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
        <lucide_react_1.Database className="h-3 w-3"/>
        <span className="font-mono truncate max-w-[200px]">{selected.fullName}</span>
        <lucide_react_1.ChevronDown className="h-3 w-3"/>
      </button>

      {open && (<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 min-w-[220px] max-h-[200px] overflow-y-auto rounded-md border bg-popover shadow-md">
          {repos.map(function (repo) { return (<button key={repo.id} className={(0, utils_1.cn)("w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors font-mono", repo.id === selected.id && "bg-accent text-accent-foreground")} onClick={function () {
                    onSelect(repo.id);
                    setOpen(false);
                }}>
              {repo.fullName}
            </button>); })}
        </div>)}
    </div>);
}
