"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommitMessageDialog = CommitMessageDialog;
var react_1 = require("react");
var dialog_1 = require("@/components/ui/dialog");
var button_1 = require("@/components/ui/button");
var lucide_react_1 = require("lucide-react");
function CommitMessageDialog(_a) {
    var open = _a.open, onOpenChange = _a.onOpenChange, onConfirm = _a.onConfirm, title = _a.title, isLoading = _a.isLoading, error = _a.error;
    var _b = (0, react_1.useState)(""), message = _b[0], setMessage = _b[1];
    var handleSubmit = (0, react_1.useCallback)(function () {
        if (message.trim()) {
            onConfirm(message.trim());
        }
    }, [message, onConfirm]);
    var handleKeyDown = (0, react_1.useCallback)(function (e) {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && message.trim() && !isLoading) {
            e.preventDefault();
            handleSubmit();
        }
    }, [handleSubmit, message, isLoading]);
    return (<dialog_1.Dialog open={open} onOpenChange={function (v) {
            if (!v)
                setMessage("");
            onOpenChange(v);
        }}>
      <dialog_1.DialogContent className="max-w-md">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle>{title}</dialog_1.DialogTitle>
        </dialog_1.DialogHeader>
        <textarea autoFocus value={message} onChange={function (e) { return setMessage(e.target.value); }} onKeyDown={handleKeyDown} placeholder="Describe your changes..." className="min-h-[80px] w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"/>
        {error && (<p className="text-xs text-destructive">{error}</p>)}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">⌘+Enter to submit</span>
          <button_1.Button size="sm" disabled={!message.trim() || isLoading} onClick={handleSubmit}>
            {isLoading && <lucide_react_1.Loader2 className="h-3.5 w-3.5 animate-spin"/>}
            {title}
          </button_1.Button>
        </div>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
