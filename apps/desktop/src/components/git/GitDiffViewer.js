"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitDiffViewer = GitDiffViewer;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var STATUS_COLORS = {
    added: "text-green-400",
    modified: "text-yellow-400",
    deleted: "text-red-400",
    renamed: "text-blue-400",
};
function GitDiffViewer(_a) {
    var entries = _a.entries, selectedFile = _a.selectedFile;
    var containerRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        if (!selectedFile || !containerRef.current)
            return;
        var el = containerRef.current.querySelector("[data-file-path=\"".concat(CSS.escape(selectedFile), "\"]"));
        el === null || el === void 0 ? void 0 : el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [selectedFile]);
    if (!entries.length) {
        return (<p className="py-8 text-center text-sm text-muted-foreground">
        No diff to display. Select a file to view changes.
      </p>);
    }
    return (<div ref={containerRef} className="space-y-4">
      {entries.map(function (entry) { return (<DiffBlock key={entry.path} entry={entry} isSelected={entry.path === selectedFile}/>); })}
    </div>);
}
function DiffBlock(_a) {
    var entry = _a.entry, isSelected = _a.isSelected;
    var _b = (0, react_1.useState)(false), collapsed = _b[0], setCollapsed = _b[1];
    return (<div data-file-path={entry.path} className={(0, utils_1.cn)("overflow-hidden rounded-md border border-border", isSelected && "ring-1 ring-primary")}>
      {/* File header */}
      <button type="button" onClick={function () { return setCollapsed(function (v) { return !v; }); }} className="flex w-full items-center gap-2 border-b border-border bg-muted/50 px-3 py-1.5 text-left">
        {collapsed ? (<lucide_react_1.ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground"/>) : (<lucide_react_1.ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground"/>)}
        <StatusBadge status={entry.status}/>
        <span className="truncate text-xs font-mono text-foreground">{entry.path}</span>
        <div className="ml-auto flex items-center gap-1.5 text-xs tabular-nums">
          {entry.additions > 0 && (<span className="text-green-400">+{entry.additions}</span>)}
          {entry.deletions > 0 && (<span className="text-red-400">-{entry.deletions}</span>)}
        </div>
      </button>

      {/* Diff content */}
      {!collapsed && (entry.hunks.length > 0 ? (<div className="overflow-x-auto">
            <pre className="text-xs leading-5">
              <table className="w-full border-collapse">
                <tbody>
                  {entry.hunks.map(function (hunk, hi) { return (<HunkBlock key={hi} hunk={hunk}/>); })}
                </tbody>
              </table>
            </pre>
          </div>) : (<div className="px-3 py-2 text-xs text-muted-foreground italic">
            Binary file or no diff available
          </div>))}
    </div>);
}
function HunkBlock(_a) {
    var hunk = _a.hunk;
    return (<>
      <tr className="bg-blue-500/10">
        <td className="select-none px-2 text-right text-muted-foreground/50 font-mono w-[1%] whitespace-nowrap"/>
        <td className="select-none px-2 text-right text-muted-foreground/50 font-mono w-[1%] whitespace-nowrap"/>
        <td className="px-3 font-mono whitespace-pre text-blue-300">{hunk.header}</td>
      </tr>
      {hunk.lines.map(function (line, li) { return (<DiffLineRow key={li} line={line}/>); })}
    </>);
}
function DiffLineRow(_a) {
    var _b, _c;
    var line = _a.line;
    var type = line.origin === "+" ? "add" : line.origin === "-" ? "del" : "ctx";
    return (<tr className={(0, utils_1.cn)(type === "add" && "bg-green-500/10", type === "del" && "bg-red-500/10")}>
      <td className="select-none px-2 text-right text-muted-foreground/50 font-mono w-[1%] whitespace-nowrap">
        {(_b = line.oldLineNo) !== null && _b !== void 0 ? _b : ""}
      </td>
      <td className="select-none px-2 text-right text-muted-foreground/50 font-mono w-[1%] whitespace-nowrap">
        {(_c = line.newLineNo) !== null && _c !== void 0 ? _c : ""}
      </td>
      <td className={(0, utils_1.cn)("px-3 font-mono whitespace-pre", type === "add" && "text-green-300", type === "del" && "text-red-300", type === "ctx" && "text-foreground/80")}>
        {line.content}
      </td>
    </tr>);
}
function StatusBadge(_a) {
    var _b;
    var status = _a.status;
    var letter = status === "renamed" ? "R" : status.charAt(0).toUpperCase();
    return (<span className={(0, utils_1.cn)("flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold", (_b = STATUS_COLORS[status]) !== null && _b !== void 0 ? _b : "text-muted-foreground")}>
      {letter}
    </span>);
}
