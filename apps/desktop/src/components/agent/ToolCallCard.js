"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolCallCard = void 0;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var ToolInputSummary_1 = require("./tool-renderers/ToolInputSummary");
var ToolOutputRenderer_1 = require("./tool-renderers/ToolOutputRenderer");
exports.ToolCallCard = (0, react_1.memo)(function ToolCallCard(_a) {
    var _b, _c;
    var toolUse = _a.toolUse, toolResult = _a.toolResult, collapsed = _a.collapsed, onToggle = _a.onToggle;
    var pending = !toolResult ||
        toolResult.streamState === "pending" ||
        toolResult.streamState === "streaming";
    var isError = (toolResult === null || toolResult === void 0 ? void 0 : toolResult.isError) || toolUse.streamState === "error";
    return (<div className="rounded-lg border border-border bg-muted/30">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50">
        {collapsed ? (<lucide_react_1.ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground"/>) : (<lucide_react_1.ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground"/>)}
        <lucide_react_1.Wrench className="h-4 w-4 shrink-0 text-muted-foreground"/>
        <span className="font-mono text-xs">{(_b = toolUse.toolName) !== null && _b !== void 0 ? _b : "tool"}</span>
        <span className="ml-auto">
          {pending ? (<lucide_react_1.Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/>) : isError ? (<lucide_react_1.X className="h-4 w-4 text-red-500"/>) : (<lucide_react_1.Check className="h-4 w-4 text-green-500"/>)}
        </span>
      </button>

      {!collapsed && (<div className="border-t border-border px-3 py-2 space-y-2">
          {(toolUse.toolInput || toolUse.toolInputText) && (<div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Input</p>
              <ToolInputSummary_1.ToolInputSummary toolName={(_c = toolUse.toolName) !== null && _c !== void 0 ? _c : "tool"} toolInput={toolUse.toolInput} toolInputText={toolUse.toolInputText}/>
            </div>)}
          {toolUse.toolStatus && (<div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
              <p className="rounded bg-background px-2 py-1 text-xs text-muted-foreground">
                {toolUse.toolStatus}
              </p>
            </div>)}
          {toolResult && (<div>
              <p className={(0, utils_1.cn)("text-xs font-medium mb-1", isError ? "text-red-400" : "text-muted-foreground")}>
                Output
              </p>
              {toolResult.content ? (<ToolOutputRenderer_1.ToolOutputRenderer content={toolResult.content} toolName={toolUse.toolName} toolInput={toolUse.toolInput} isStreaming={toolResult.streamState === "streaming"} isError={isError}/>) : (<p className="rounded bg-background px-2 py-1 text-xs text-muted-foreground">
                  {pending ? "Waiting for tool output..." : "Tool completed without output."}
                </p>)}
            </div>)}
        </div>)}
    </div>);
});
