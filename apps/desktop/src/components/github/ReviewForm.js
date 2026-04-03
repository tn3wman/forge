"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewForm = ReviewForm;
var react_1 = require("react");
var button_1 = require("@/components/ui/button");
function ReviewForm(_a) {
    var onSubmit = _a.onSubmit, _b = _a.isSubmitting, isSubmitting = _b === void 0 ? false : _b;
    var _c = (0, react_1.useState)(""), body = _c[0], setBody = _c[1];
    var handleSubmit = function (event) {
        onSubmit(event, body);
        setBody("");
    };
    return (<div className="rounded-md border border-border bg-background">
      <div className="p-3">
        <textarea value={body} onChange={function (e) { return setBody(e.target.value); }} placeholder="Leave a review comment..." className="min-h-[80px] w-full resize-y rounded bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"/>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border px-3 py-2">
        <button_1.Button variant="outline" size="sm" disabled={isSubmitting} onClick={function () { return handleSubmit("COMMENT"); }}>
          Comment
        </button_1.Button>
        <button_1.Button size="sm" disabled={isSubmitting} onClick={function () { return handleSubmit("APPROVE"); }} className="bg-green-600 text-white hover:bg-green-700">
          Approve
        </button_1.Button>
        <button_1.Button size="sm" disabled={isSubmitting} onClick={function () { return handleSubmit("REQUEST_CHANGES"); }} className="bg-red-600 text-white hover:bg-red-700">
          Request Changes
        </button_1.Button>
      </div>
    </div>);
}
