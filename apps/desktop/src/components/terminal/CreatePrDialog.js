"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePrDialog = CreatePrDialog;
var react_1 = require("react");
var dialog_1 = require("@/components/ui/dialog");
var button_1 = require("@/components/ui/button");
var lucide_react_1 = require("lucide-react");
var useGitBranches_1 = require("@/queries/useGitBranches");
var useMutations_1 = require("@/queries/useMutations");
var authStore_1 = require("@/stores/authStore");
var git_1 = require("@/ipc/git");
function parseOwnerRepo(remoteUrl) {
    var match = remoteUrl.match(/[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/);
    if (!match)
        return null;
    return { owner: match[1], repo: match[2] };
}
function CreatePrDialog(_a) {
    var _this = this;
    var open = _a.open, onOpenChange = _a.onOpenChange, workingDirectory = _a.workingDirectory;
    var isAuthenticated = (0, authStore_1.useAuthStore)(function (s) { return s.isAuthenticated; });
    var currentBranch = (0, useGitBranches_1.useCurrentBranch)(workingDirectory).data;
    var createPr = (0, useMutations_1.useCreatePr)();
    var _b = (0, react_1.useState)(null), ownerRepo = _b[0], setOwnerRepo = _b[1];
    var _c = (0, react_1.useState)(""), title = _c[0], setTitle = _c[1];
    var _d = (0, react_1.useState)(""), body = _d[0], setBody = _d[1];
    var _e = (0, react_1.useState)("main"), base = _e[0], setBase = _e[1];
    var _f = (0, react_1.useState)(true), draft = _f[0], setDraft = _f[1];
    var _g = (0, react_1.useState)(null), error = _g[0], setError = _g[1];
    // Reset form state when dialog opens
    (0, react_1.useEffect)(function () {
        if (!open)
            return;
        setBody("");
        setBase("main");
        setDraft(true);
        setError(null);
        git_1.gitIpc.getRemoteUrl(workingDirectory).then(function (url) {
            if (url) {
                var parsed = parseOwnerRepo(url);
                setOwnerRepo(parsed);
                if (!parsed)
                    setError("Could not parse remote URL: " + url);
            }
            else {
                setError("No remote configured for this repository");
            }
        }).catch(function (e) {
            setError(e instanceof Error ? e.message : String(e));
        });
    }, [open, workingDirectory]);
    (0, react_1.useEffect)(function () {
        if (open && currentBranch) {
            setTitle(currentBranch.replace(/[-_]/g, " ").replace(/^\w/, function (c) { return c.toUpperCase(); }));
        }
    }, [open, currentBranch]);
    var canSubmit = !!ownerRepo && isAuthenticated && !!title.trim() && !!currentBranch && currentBranch !== base;
    var handleSubmit = function () { return __awaiter(_this, void 0, void 0, function () {
        var result, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!canSubmit || !ownerRepo)
                        return [2 /*return*/];
                    setError(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, createPr.mutateAsync({
                            owner: ownerRepo.owner,
                            repo: ownerRepo.repo,
                            title: title.trim(),
                            body: body.trim(),
                            head: currentBranch,
                            base: base,
                            draft: draft,
                        })];
                case 2:
                    result = _a.sent();
                    onOpenChange(false);
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    setError(e_1 instanceof Error ? e_1.message : String(e_1));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    return (<dialog_1.Dialog open={open} onOpenChange={onOpenChange}>
      <dialog_1.DialogContent className="max-w-md">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle>Create Pull Request</dialog_1.DialogTitle>
        </dialog_1.DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
            <input autoFocus value={title} onChange={function (e) { return setTitle(e.target.value); }} className="w-full rounded-md border bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"/>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
            <textarea value={body} onChange={function (e) { return setBody(e.target.value); }} placeholder="Optional..." className="min-h-[60px] w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"/>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Base branch</label>
              <input value={base} onChange={function (e) { return setBase(e.target.value); }} className="w-full rounded-md border bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"/>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Head branch</label>
              <input value={currentBranch !== null && currentBranch !== void 0 ? currentBranch : ""} disabled className="w-full rounded-md border bg-transparent px-3 py-1.5 text-sm text-muted-foreground"/>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft} onChange={function (e) { return setDraft(e.target.checked); }} className="rounded"/>
            Create as draft
          </label>
          {currentBranch === base && (<p className="text-xs text-yellow-500">Cannot create PR: head and base branches are the same</p>)}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end">
            <button_1.Button size="sm" disabled={!canSubmit || createPr.isPending} onClick={handleSubmit}>
              {createPr.isPending && <lucide_react_1.Loader2 className="h-3.5 w-3.5 animate-spin"/>}
              Create PR
            </button_1.Button>
          </div>
        </div>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
