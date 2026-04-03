"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessage = void 0;
var react_1 = require("react");
var react_markdown_1 = require("react-markdown");
var remark_gfm_1 = require("remark-gfm");
var rehype_highlight_1 = require("rehype-highlight");
require("highlight.js/styles/github-dark.css");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
/**
 * Escape bare ordered-list markers (e.g. "100." on a line by itself)
 * so ReactMarkdown doesn't render short numeric answers as `<ol>`.
 * Real list items like "1. First item" are left intact.
 */
function escapeBareLists(text) {
    return text.replace(/^(\d{1,9})\.\s*$/gm, "$1\\.");
}
exports.ChatMessage = (0, react_1.memo)(function ChatMessage(_a) {
    var _b, _c, _d, _e;
    var message = _a.message, onToggleReasoning = _a.onToggleReasoning;
    var isUser = message.type === "user";
    var isAssistantStreaming = !isUser &&
        (message.streamState === "pending" || message.streamState === "streaming");
    var hasReasoning = !isUser && !!message.reasoning;
    var reasoningSummary = (_c = (_b = message.reasoning) === null || _b === void 0 ? void 0 : _b.trim().split("\n")[0]) !== null && _c !== void 0 ? _c : "Thinking";
    return (<div className={(0, utils_1.cn)("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className={(0, utils_1.cn)("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
        {isUser ? <lucide_react_1.User className="h-4 w-4"/> : <lucide_react_1.Bot className="h-4 w-4"/>}
      </div>

      <div className={(0, utils_1.cn)("max-w-[80%] rounded-lg px-3 py-2 text-sm", isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted/50 text-foreground")}>
        {isUser ? (<div>
            {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
            {((_d = message.images) === null || _d === void 0 ? void 0 : _d.length) ? (<div className="flex flex-wrap gap-2 mt-2">
                {message.images.map(function (img, i) {
                    var _a;
                    return (<img key={i} src={"data:".concat(img.mediaType, ";base64,").concat(img.data)} alt={(_a = img.fileName) !== null && _a !== void 0 ? _a : "Image ".concat(i + 1)} className="max-h-48 rounded-md border border-border/50"/>);
                })}
              </div>) : null}
          </div>) : (<div className="space-y-3">
            {isAssistantStreaming && (<div className="flex items-center gap-2 text-xs text-muted-foreground">
                <lucide_react_1.Loader2 className="h-3.5 w-3.5 animate-spin"/>
                <span>{message.content ? "Streaming response" : "Thinking"}</span>
              </div>)}

            {message.content ? (<div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:my-0">
                <react_markdown_1.default remarkPlugins={[remark_gfm_1.default]} rehypePlugins={[rehype_highlight_1.default]}>
                  {escapeBareLists(message.content)}
                </react_markdown_1.default>
              </div>) : null}

            {hasReasoning && (<div className="rounded-md border border-border/70 bg-background/60">
                <button type="button" onClick={onToggleReasoning} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/40">
                  {message.reasoningCollapsed ? (<lucide_react_1.ChevronRight className="h-3.5 w-3.5 shrink-0"/>) : (<lucide_react_1.ChevronDown className="h-3.5 w-3.5 shrink-0"/>)}
                  <lucide_react_1.Brain className="h-3.5 w-3.5 shrink-0"/>
                  <span className="font-medium">Thinking</span>
                  {message.reasoningState === "streaming" && (<lucide_react_1.Loader2 className="ml-auto h-3.5 w-3.5 animate-spin"/>)}
                </button>

                {message.reasoningCollapsed ? (<p className="border-t border-border/70 px-3 py-2 text-xs text-muted-foreground line-clamp-2">
                    {reasoningSummary}
                  </p>) : (<div className="border-t border-border/70 px-3 py-2">
                    <div className="prose prose-sm prose-invert max-w-none text-xs text-muted-foreground [&>*]:text-muted-foreground [&>*]:text-xs [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:my-0">
                      <react_markdown_1.default remarkPlugins={[remark_gfm_1.default]} rehypePlugins={[rehype_highlight_1.default]}>
                        {escapeBareLists((_e = message.reasoning) !== null && _e !== void 0 ? _e : "")}
                      </react_markdown_1.default>
                    </div>
                  </div>)}
              </div>)}
          </div>)}
      </div>
    </div>);
});
