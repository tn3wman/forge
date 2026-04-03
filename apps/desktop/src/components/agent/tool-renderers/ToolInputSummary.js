"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolInputSummary = void 0;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var DiffView_1 = require("./DiffView");
function shortenPath(filePath) {
    if (!filePath)
        return "unknown";
    var parts = filePath.split("/");
    if (parts.length <= 3)
        return filePath;
    return ".../" + parts.slice(-3).join("/");
}
function buildEditDiff(oldStr, newStr) {
    var oldLines = oldStr.split("\n");
    var newLines = newStr.split("\n");
    var lines = [];
    for (var _i = 0, oldLines_1 = oldLines; _i < oldLines_1.length; _i++) {
        var l = oldLines_1[_i];
        lines.push("-".concat(l));
    }
    for (var _a = 0, newLines_1 = newLines; _a < newLines_1.length; _a++) {
        var l = newLines_1[_a];
        lines.push("+".concat(l));
    }
    return lines.join("\n");
}
exports.ToolInputSummary = (0, react_1.memo)(function ToolInputSummary(_a) {
    var toolName = _a.toolName, toolInput = _a.toolInput, toolInputText = _a.toolInputText;
    if (!toolInput) {
        if (toolInputText) {
            return (<pre className="max-h-48 overflow-auto rounded bg-background p-2 text-xs">
          <code>{toolInputText}</code>
        </pre>);
        }
        return null;
    }
    var name = toolName.toLowerCase();
    if (name === "read") {
        var filePath = toolInput.file_path;
        var offset = toolInput.offset;
        var limit = toolInput.limit;
        var range = offset || limit
            ? " (".concat(offset ? "from line ".concat(offset) : "").concat(offset && limit ? ", " : "").concat(limit ? "".concat(limit, " lines") : "", ")")
            : "";
        return (<div className="flex items-center gap-2 text-xs">
        <lucide_react_1.FileText className="h-3.5 w-3.5 shrink-0 text-blue-400"/>
        <span className="text-muted-foreground">Read</span>
        <code className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
          {shortenPath(filePath)}
        </code>
        {range && <span className="text-muted-foreground">{range}</span>}
      </div>);
    }
    if (name === "edit") {
        var filePath = toolInput.file_path;
        var oldString = toolInput.old_string;
        var newString = toolInput.new_string;
        return (<div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <lucide_react_1.Pencil className="h-3.5 w-3.5 shrink-0 text-yellow-400"/>
          <span className="text-muted-foreground">Edit</span>
          <code className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
            {shortenPath(filePath)}
          </code>
        </div>
        {oldString != null && newString != null && (<div className="max-h-48 overflow-auto">
            <DiffView_1.DiffView content={buildEditDiff(oldString, newString)}/>
          </div>)}
      </div>);
    }
    if (name === "write") {
        var filePath = toolInput.file_path;
        var content = toolInput.content;
        var bytes = content ? "(".concat(content.length, " chars)") : "";
        return (<div className="flex items-center gap-2 text-xs">
        <lucide_react_1.FilePlus className="h-3.5 w-3.5 shrink-0 text-green-400"/>
        <span className="text-muted-foreground">Write</span>
        <code className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
          {shortenPath(filePath)}
        </code>
        {bytes && <span className="text-muted-foreground">{bytes}</span>}
      </div>);
    }
    if (name === "bash") {
        var command = toolInput.command;
        var description = toolInput.description;
        return (<div className="space-y-1">
        {description && (<p className="text-xs text-muted-foreground">{description}</p>)}
        <div className="flex items-start gap-2 rounded bg-background px-2 py-1.5">
          <lucide_react_1.Terminal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400"/>
          <code className="text-xs font-mono text-foreground break-all">
            {command}
          </code>
        </div>
      </div>);
    }
    if (name === "grep") {
        var pattern = toolInput.pattern;
        var path = toolInput.path;
        return (<div className="flex items-center gap-2 text-xs">
        <lucide_react_1.Search className="h-3.5 w-3.5 shrink-0 text-purple-400"/>
        <span className="text-muted-foreground">Search for</span>
        <code className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
          {pattern}
        </code>
        {path && (<>
            <span className="text-muted-foreground">in</span>
            <code className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
              {shortenPath(path)}
            </code>
          </>)}
      </div>);
    }
    if (name === "glob") {
        var pattern = toolInput.pattern;
        var path = toolInput.path;
        return (<div className="flex items-center gap-2 text-xs">
        <lucide_react_1.FolderSearch className="h-3.5 w-3.5 shrink-0 text-orange-400"/>
        <span className="text-muted-foreground">Find files</span>
        <code className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
          {pattern}
        </code>
        {path && (<>
            <span className="text-muted-foreground">in</span>
            <code className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
              {shortenPath(path)}
            </code>
          </>)}
      </div>);
    }
    // Fallback: compact key-value display instead of raw JSON
    return (<div className="space-y-1">
      {Object.entries(toolInput).map(function (_a) {
            var key = _a[0], value = _a[1];
            var strValue = typeof value === "string"
                ? value.length > 200
                    ? value.slice(0, 200) + "..."
                    : value
                : JSON.stringify(value);
            return (<div key={key} className="flex gap-2 text-xs">
            <span className="shrink-0 text-muted-foreground">{key}:</span>
            <code className="break-all font-mono text-foreground">{strValue}</code>
          </div>);
        })}
    </div>);
});
