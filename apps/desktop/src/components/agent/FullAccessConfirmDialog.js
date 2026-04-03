"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FullAccessConfirmDialog = FullAccessConfirmDialog;
var dialog_1 = require("@/components/ui/dialog");
var button_1 = require("@/components/ui/button");
var lucide_react_1 = require("lucide-react");
function FullAccessConfirmDialog(_a) {
    var open = _a.open, onConfirm = _a.onConfirm, onCancel = _a.onCancel;
    return (<dialog_1.Dialog open={open} onOpenChange={function (v) { return !v && onCancel(); }}>
      <dialog_1.DialogContent className="sm:max-w-md">
        <dialog_1.DialogHeader>
          <div className="flex items-center gap-2">
            <lucide_react_1.ShieldAlert className="h-5 w-5 text-destructive"/>
            <dialog_1.DialogTitle>Enable Full Access?</dialog_1.DialogTitle>
          </div>
          <dialog_1.DialogDescription className="pt-2 text-sm leading-relaxed">
            Full Access mode allows the agent to read, write, and execute
            commands on your system without asking for permission. Only use
            this if you trust the agent with unrestricted access to your
            machine.
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>
        <div className="flex justify-end gap-2 pt-4">
          <button_1.Button variant="outline" onClick={onCancel}>
            Cancel
          </button_1.Button>
          <button_1.Button variant="destructive" onClick={onConfirm}>
            Enable Full Access
          </button_1.Button>
        </div>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
