"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolOutputRenderer = void 0;
var react_1 = require("react");
var DiffView_1 = require("./DiffView");
var languageDetect_1 = require("@/lib/languageDetect");
function detectContentType(content, toolName) {
    var lines = content.split("\n", 10);
    var hasDiffMarkers = lines.some(function (l) {
        return l.startsWith("---") ||
            l.startsWith("+++") ||
            l.startsWith("@@") ||
            l.startsWith("diff --git");
    });
    if (hasDiffMarkers)
        return "diff";
    if ((toolName === null || toolName === void 0 ? void 0 : toolName.toLowerCase()) === "read")
        return "code";
    return "text";
}
exports.ToolOutputRenderer = (0, react_1.memo)(function ToolOutputRenderer(_a) {
    var content = _a.content, toolName = _a.toolName, toolInput = _a.toolInput, isStreaming = _a.isStreaming, isError = _a.isError;
    var contentType = (0, react_1.useMemo)(function () { return detectContentType(content, toolName); }, [content, toolName]);
    var language = (0, react_1.useMemo)(function () {
        if (contentType !== "code")
            return undefined;
        var filePath = toolInput === null || toolInput === void 0 ? void 0 : toolInput.file_path;
        return filePath ? (0, languageDetect_1.detectLanguage)(filePath) : undefined;
    }, [contentType, toolInput]);
    if (isError) {
        return (<pre className="max-h-48 overflow-auto rounded bg-red-500/10 p-2 text-xs text-red-400">
        <code>{content}</code>
      </pre>);
    }
    if (contentType === "diff") {
        return (<div className="max-h-48 overflow-auto">
        <DiffView_1.DiffView content={content}/>
      </div>);
    }
    if (contentType === "code" && language && !isStreaming) {
        return (<pre className="max-h-48 overflow-auto rounded bg-background p-2 text-xs">
        <code className={"language-".concat(language)}>{content}</code>
      </pre>);
    }
    return (<pre className="max-h-48 overflow-auto rounded bg-background p-2 text-xs">
      <code>{content}</code>
    </pre>);
});
