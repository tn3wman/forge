"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommitForm = CommitForm;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var button_1 = require("@/components/ui/button");
var useGitMutations_1 = require("@/queries/useGitMutations");
var useGitLog_1 = require("@/queries/useGitLog");
function CommitForm(_a) {
    var _b, _c, _d, _e, _f, _g;
    var localPath = _a.localPath, stagedCount = _a.stagedCount;
    var _h = (0, react_1.useState)(""), message = _h[0], setMessage = _h[1];
    var _j = (0, react_1.useState)(false), amend = _j[0], setAmend = _j[1];
    var textareaRef = (0, react_1.useRef)(null);
    var commitMutation = (0, useGitMutations_1.useCommit)();
    var amendMutation = (0, useGitMutations_1.useAmend)();
    var logPages = (0, useGitLog_1.useGitLog)(localPath).data;
    var lastCommitMessage = (_f = (_e = (_d = (_c = (_b = logPages === null || logPages === void 0 ? void 0 : logPages.pages) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.commit) === null || _e === void 0 ? void 0 : _e.message) !== null && _f !== void 0 ? _f : "";
    // Load last commit message when amend is checked
    (0, react_1.useEffect)(function () {
        if (amend && lastCommitMessage) {
            setMessage(lastCommitMessage);
        }
    }, [amend, lastCommitMessage]);
    var firstLine = (_g = message.split("\n")[0]) !== null && _g !== void 0 ? _g : "";
    var firstLineOverflow = firstLine.length > 72;
    var canCommit = stagedCount > 0 && message.trim().length > 0;
    var isPending = commitMutation.isPending || amendMutation.isPending;
    var handleSubmit = (0, react_1.useCallback)(function () {
        if (!canCommit || isPending)
            return;
        var mutation = amend ? amendMutation : commitMutation;
        mutation.mutate({ path: localPath, message: message.trim() }, {
            onSuccess: function () {
                setMessage("");
                setAmend(false);
            },
        });
    }, [canCommit, isPending, amend, amendMutation, commitMutation, localPath, message]);
    var handleKeyDown = (0, react_1.useCallback)(function (e) {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
        }
    }, [handleSubmit]);
    return (<div className="border-t border-border p-3 space-y-2">
      <textarea ref={textareaRef} value={message} onChange={function (e) { return setMessage(e.target.value); }} onKeyDown={handleKeyDown} placeholder="Commit message..." rows={3} className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"/>

      <div className="flex items-center justify-between text-xs">
        <span className={(0, utils_1.cn)("tabular-nums text-muted-foreground", firstLineOverflow && "text-yellow-400")}>
          {firstLine.length}/72
        </span>
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
          <input type="checkbox" checked={amend} onChange={function (e) { return setAmend(e.target.checked); }} className="rounded border-border"/>
          Amend
        </label>

        <div className="flex-1"/>

        <button_1.Button size="sm" onClick={handleSubmit} disabled={!canCommit || isPending} className="text-xs">
          {isPending ? (<lucide_react_1.Loader2 className="h-3 w-3 animate-spin"/>) : null}
          {amend ? "Amend" : "Commit"} ({stagedCount})
        </button_1.Button>
      </div>
    </div>);
}
