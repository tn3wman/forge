"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentEditor = CommentEditor;
var react_1 = require("react");
var utils_1 = require("@/lib/utils");
var button_1 = require("@/components/ui/button");
var MarkdownBody_1 = require("@/components/common/MarkdownBody");
function CommentEditor(_a) {
    var onSubmit = _a.onSubmit, onCancel = _a.onCancel, _b = _a.placeholder, placeholder = _b === void 0 ? "Leave a comment..." : _b, _c = _a.submitLabel, submitLabel = _c === void 0 ? "Comment" : _c, _d = _a.isSubmitting, isSubmitting = _d === void 0 ? false : _d;
    var _e = (0, react_1.useState)(""), value = _e[0], setValue = _e[1];
    var _f = (0, react_1.useState)(false), showPreview = _f[0], setShowPreview = _f[1];
    var handleSubmit = function () {
        if (!value.trim())
            return;
        onSubmit(value);
        setValue("");
        setShowPreview(false);
    };
    return (<div className="rounded-md border border-border bg-background">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        <button type="button" className={(0, utils_1.cn)("px-3 py-1.5 text-xs font-medium transition-colors", !showPreview
            ? "border-b-2 border-primary text-foreground"
            : "text-muted-foreground hover:text-foreground")} onClick={function () { return setShowPreview(false); }}>
          Write
        </button>
        <button type="button" className={(0, utils_1.cn)("px-3 py-1.5 text-xs font-medium transition-colors", showPreview
            ? "border-b-2 border-primary text-foreground"
            : "text-muted-foreground hover:text-foreground")} onClick={function () { return setShowPreview(true); }}>
          Preview
        </button>
      </div>

      {/* Content area */}
      <div className="p-2">
        {showPreview ? (<div className="min-h-[100px] px-1">
            {value.trim() ? (<MarkdownBody_1.MarkdownBody content={value}/>) : (<p className="text-sm text-muted-foreground italic">
                Nothing to preview
              </p>)}
          </div>) : (<textarea value={value} onChange={function (e) { return setValue(e.target.value); }} placeholder={placeholder} className="min-h-[100px] w-full resize-y rounded bg-transparent p-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"/>)}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-border px-2 py-1.5">
        {onCancel && (<button_1.Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </button_1.Button>)}
        <button_1.Button size="sm" onClick={handleSubmit} disabled={!value.trim() || isSubmitting}>
          {isSubmitting ? "Submitting..." : submitLabel}
        </button_1.Button>
      </div>
    </div>);
}
