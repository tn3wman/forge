"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiffView = void 0;
var react_1 = require("react");
var utils_1 = require("@/lib/utils");
function classifyLine(line) {
    if (line.startsWith("@@"))
        return "header";
    if (line.startsWith("+++") || line.startsWith("---"))
        return "meta";
    if (line.startsWith("+"))
        return "add";
    if (line.startsWith("-"))
        return "remove";
    return "context";
}
exports.DiffView = (0, react_1.memo)(function DiffView(_a) {
    var content = _a.content;
    var lines = content.split("\n");
    return (<div className="overflow-auto rounded bg-background text-xs font-mono">
      {lines.map(function (line, i) {
            var type = classifyLine(line);
            return (<div key={i} className={(0, utils_1.cn)("px-2 whitespace-pre", type === "add" && "bg-green-500/15 text-green-400", type === "remove" && "bg-red-500/15 text-red-400", type === "header" && "bg-blue-500/10 text-blue-400", type === "meta" && "text-muted-foreground", type === "context" && "text-muted-foreground")}>
            {line}
          </div>);
        })}
    </div>);
});
