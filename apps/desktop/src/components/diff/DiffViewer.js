"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiffViewer = DiffViewer;
var react_1 = require("react");
var utils_1 = require("@/lib/utils");
function DiffViewer(_a) {
    var files = _a.files, selectedFile = _a.selectedFile;
    var containerRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        if (!selectedFile || !containerRef.current)
            return;
        var el = containerRef.current.querySelector("[data-file-path=\"".concat(CSS.escape(selectedFile), "\"]"));
        el === null || el === void 0 ? void 0 : el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [selectedFile]);
    if (!files.length) {
        return (<p className="py-8 text-center text-sm text-muted-foreground">
        No files changed.
      </p>);
    }
    return (<div ref={containerRef} className="space-y-4">
      {files.map(function (file) { return (<DiffBlock key={file.path} file={file} isSelected={file.path === selectedFile}/>); })}
    </div>);
}
var STATUS_COLORS = {
    added: "text-green-400",
    removed: "text-red-400",
    modified: "text-yellow-400",
    renamed: "text-blue-400",
};
function DiffBlock(_a) {
    var file = _a.file, isSelected = _a.isSelected;
    var lines = parsePatch(file.patch);
    return (<div data-file-path={file.path} className={(0, utils_1.cn)("overflow-hidden rounded-md border border-border", isSelected && "ring-1 ring-primary")}>
      {/* File header */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-1.5">
        <StatusBadge status={file.status}/>
        <span className="truncate text-xs font-mono text-foreground">
          {file.previousPath && file.status === "renamed" ? (<>
              <span className="text-muted-foreground">{file.previousPath}</span>
              <span className="text-muted-foreground"> → </span>
              {file.path}
            </>) : (file.path)}
        </span>
        <div className="ml-auto flex items-center gap-1.5 text-xs tabular-nums">
          {file.additions > 0 && (<span className="text-green-400">+{file.additions}</span>)}
          {file.deletions > 0 && (<span className="text-red-400">-{file.deletions}</span>)}
        </div>
      </div>

      {/* Diff content */}
      {file.patch ? (<div className="overflow-x-auto">
          <pre className="text-xs leading-5">
            <table className="w-full border-collapse">
              <tbody>
                {lines.map(function (line, i) {
                var _a, _b;
                return (<tr key={i} className={(0, utils_1.cn)(line.type === "add" && "bg-green-500/10", line.type === "del" && "bg-red-500/10", line.type === "hunk" && "bg-blue-500/10")}>
                    <td className="select-none px-2 text-right text-muted-foreground/50 font-mono w-[1%] whitespace-nowrap">
                      {(_a = line.oldNum) !== null && _a !== void 0 ? _a : ""}
                    </td>
                    <td className="select-none px-2 text-right text-muted-foreground/50 font-mono w-[1%] whitespace-nowrap">
                      {(_b = line.newNum) !== null && _b !== void 0 ? _b : ""}
                    </td>
                    <td className={(0, utils_1.cn)("px-3 font-mono whitespace-pre", line.type === "add" && "text-green-300", line.type === "del" && "text-red-300", line.type === "hunk" && "text-blue-300", line.type === "ctx" && "text-foreground/80")}>
                      {line.content}
                    </td>
                  </tr>);
            })}
              </tbody>
            </table>
          </pre>
        </div>) : (<div className="px-3 py-2 text-xs text-muted-foreground italic">
          Binary file or no diff available
        </div>)}
    </div>);
}
function StatusBadge(_a) {
    var _b;
    var status = _a.status;
    var letter = status === "renamed" ? "R" : status.charAt(0).toUpperCase();
    return (<span className={(0, utils_1.cn)("flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold", (_b = STATUS_COLORS[status]) !== null && _b !== void 0 ? _b : "text-muted-foreground")}>
      {letter}
    </span>);
}
function parsePatch(patch) {
    if (!patch)
        return [];
    var rawLines = patch.split("\n");
    var result = [];
    var oldLine = 0;
    var newLine = 0;
    for (var _i = 0, rawLines_1 = rawLines; _i < rawLines_1.length; _i++) {
        var raw = rawLines_1[_i];
        if (raw.startsWith("@@")) {
            // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
            var match = raw.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
            if (match) {
                oldLine = parseInt(match[1], 10);
                newLine = parseInt(match[2], 10);
            }
            result.push({ type: "hunk", content: raw, oldNum: null, newNum: null });
        }
        else if (raw.startsWith("+")) {
            result.push({ type: "add", content: raw, oldNum: null, newNum: newLine });
            newLine++;
        }
        else if (raw.startsWith("-")) {
            result.push({ type: "del", content: raw, oldNum: oldLine, newNum: null });
            oldLine++;
        }
        else {
            result.push({ type: "ctx", content: raw, oldNum: oldLine, newNum: newLine });
            oldLine++;
            newLine++;
        }
    }
    return result;
}
