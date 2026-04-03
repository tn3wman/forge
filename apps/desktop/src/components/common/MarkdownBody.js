"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownBody = MarkdownBody;
var react_markdown_1 = require("react-markdown");
var remark_gfm_1 = require("remark-gfm");
var rehype_raw_1 = require("rehype-raw");
var rehype_sanitize_1 = require("rehype-sanitize");
var utils_1 = require("@/lib/utils");
// Allow GitHub-style HTML elements through sanitization
var sanitizeSchema = __assign(__assign({}, rehype_sanitize_1.defaultSchema), { tagNames: __spreadArray(__spreadArray([], ((_a = rehype_sanitize_1.defaultSchema.tagNames) !== null && _a !== void 0 ? _a : []), true), [
        "details",
        "summary",
        "sub",
        "sup",
        "kbd",
        "abbr",
        "mark",
    ], false), attributes: __assign(__assign({}, rehype_sanitize_1.defaultSchema.attributes), { details: ["open"], summary: [], input: ["type", "checked", "disabled"] }) });
function stripHtmlComments(text) {
    return text.replace(/<!--[\s\S]*?-->/g, "");
}
function MarkdownBody(_a) {
    var content = _a.content, className = _a.className;
    if (!content)
        return null;
    var cleaned = stripHtmlComments(content);
    return (<div className={(0, utils_1.cn)("markdown-body text-sm text-foreground", className)}>
      <react_markdown_1.default remarkPlugins={[remark_gfm_1.default]} rehypePlugins={[rehype_raw_1.default, [rehype_sanitize_1.default, sanitizeSchema]]} components={{
            h1: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<h1 className="text-xl font-semibold border-b border-border pb-2 mb-3 mt-4 first:mt-0" {...props}>{children}</h1>);
            },
            h2: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<h2 className="text-lg font-semibold border-b border-border pb-1.5 mb-2.5 mt-4 first:mt-0" {...props}>{children}</h2>);
            },
            h3: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<h3 className="text-base font-semibold mb-2 mt-3 first:mt-0" {...props}>{children}</h3>);
            },
            h4: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<h4 className="text-sm font-semibold mb-2 mt-3 first:mt-0" {...props}>{children}</h4>);
            },
            p: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<p className="mb-3 last:mb-0 leading-relaxed" {...props}>{children}</p>);
            },
            a: function (_a) {
                var children = _a.children, href = _a.href, props = __rest(_a, ["children", "href"]);
                return (<a href={href} className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/40 hover:decoration-blue-300/60" target="_blank" rel="noopener noreferrer" {...props}>
              {children}
            </a>);
            },
            strong: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<strong className="font-semibold text-foreground" {...props}>{children}</strong>);
            },
            em: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<em className="italic" {...props}>{children}</em>);
            },
            blockquote: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<blockquote className="border-l-[3px] border-border pl-3 my-3 text-muted-foreground [&>p]:mb-1 [&>p:last-child]:mb-0" {...props}>
              {children}
            </blockquote>);
            },
            ul: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<ul className="list-disc pl-5 mb-3 last:mb-0 space-y-1 [&_ul]:mb-0 [&_ul]:mt-1" {...props}>{children}</ul>);
            },
            ol: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<ol className="list-decimal pl-5 mb-3 last:mb-0 space-y-1 [&_ol]:mb-0 [&_ol]:mt-1" {...props}>{children}</ol>);
            },
            li: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<li className="leading-relaxed [&>p]:mb-1 [&>p:last-child]:mb-0" {...props}>{children}</li>);
            },
            code: function (_a) {
                var children = _a.children, codeClassName = _a.className, props = __rest(_a, ["children", "className"]);
                var isInline = !codeClassName;
                if (isInline) {
                    return (<code className="rounded-md bg-muted/80 px-1.5 py-0.5 text-[0.85em] font-mono text-foreground" {...props}>
                  {children}
                </code>);
                }
                return (<code className={(0, utils_1.cn)("text-[0.85em] font-mono", codeClassName)} {...props}>
                {children}
              </code>);
            },
            pre: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<pre className="overflow-x-auto rounded-md border border-border bg-muted/50 p-3 text-[0.85em] leading-snug mb-3 last:mb-0" {...props}>
              {children}
            </pre>);
            },
            hr: function (_a) {
                var props = __rest(_a, []);
                return (<hr className="border-border my-4" {...props}/>);
            },
            table: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<div className="overflow-x-auto mb-3 last:mb-0">
              <table className="min-w-full border-collapse text-sm" {...props}>
                {children}
              </table>
            </div>);
            },
            thead: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<thead className="bg-muted/50" {...props}>{children}</thead>);
            },
            th: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<th className="border border-border px-3 py-1.5 text-left text-xs font-semibold" {...props}>
              {children}
            </th>);
            },
            td: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<td className="border border-border px-3 py-1.5 text-xs" {...props}>
              {children}
            </td>);
            },
            img: function (_a) {
                var src = _a.src, alt = _a.alt, props = __rest(_a, ["src", "alt"]);
                return (<img src={src} alt={alt !== null && alt !== void 0 ? alt : ""} className="max-w-full rounded-md my-2" loading="lazy" {...props}/>);
            },
            input: function (_a) {
                var checked = _a.checked, props = __rest(_a, ["checked"]);
                return (<input type="checkbox" checked={checked} disabled className="mr-1.5 rounded border-border accent-blue-500" {...props}/>);
            },
            del: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<del className="text-muted-foreground line-through" {...props}>{children}</del>);
            },
            // HTML elements used in GitHub comments
            details: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<details className="my-2 rounded-md border border-border overflow-hidden [&[open]>summary]:border-b [&[open]>summary]:border-border [&>:not(summary)]:px-3 [&>:not(summary)]:py-1 [&>:last-child]:pb-2 [&>details]:ml-2" {...props}>
              {children}
            </details>);
            },
            summary: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<summary className="cursor-pointer select-none bg-muted/30 px-3 py-2 text-sm font-medium hover:bg-muted/50" {...props}>
              {children}
            </summary>);
            },
            sub: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<sub className="text-xs text-muted-foreground" {...props}>{children}</sub>);
            },
            sup: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<sup className="text-xs" {...props}>{children}</sup>);
            },
            kbd: function (_a) {
                var children = _a.children, props = __rest(_a, ["children"]);
                return (<kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono shadow-sm" {...props}>{children}</kbd>);
            },
        }}>
        {cleaned}
      </react_markdown_1.default>
    </div>);
}
