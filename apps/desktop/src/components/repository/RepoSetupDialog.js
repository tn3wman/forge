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
exports.RepoSetupDialog = RepoSetupDialog;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var plugin_dialog_1 = require("@tauri-apps/plugin-dialog");
var dialog_1 = require("@/components/ui/dialog");
var button_1 = require("@/components/ui/button");
var git_1 = require("@/ipc/git");
var useGitMutations_1 = require("@/queries/useGitMutations");
function parseGitHubRemote(url) {
    var match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    return match ? { owner: match[1], name: match[2] } : null;
}
function RepoSetupDialog(_a) {
    var _this = this;
    var isOpen = _a.open, onOpenChange = _a.onOpenChange, repos = _a.repos;
    var _b = (0, react_1.useState)(0), currentIndex = _b[0], setCurrentIndex = _b[1];
    var _c = (0, react_1.useState)(null), error = _c[0], setError = _c[1];
    var _d = (0, react_1.useState)(false), busy = _d[0], setBusy = _d[1];
    var setLocalPath = (0, useGitMutations_1.useSetLocalPath)();
    var cloneRepo = (0, useGitMutations_1.useCloneRepo)();
    var currentRepo = repos[currentIndex];
    var total = repos.length;
    function advance() {
        setError(null);
        if (currentIndex + 1 >= total) {
            onOpenChange(false);
            setCurrentIndex(0);
        }
        else {
            setCurrentIndex(function (i) { return i + 1; });
        }
    }
    function handleClose(open) {
        if (!open) {
            setCurrentIndex(0);
            setError(null);
        }
        onOpenChange(open);
    }
    var handleSelectLocal = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var selected, remoteUrl, parsed, matches, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!currentRepo)
                        return [2 /*return*/];
                    setError(null);
                    return [4 /*yield*/, (0, plugin_dialog_1.open)({
                            directory: true,
                            title: "Select local clone of ".concat(currentRepo.fullName),
                        })];
                case 1:
                    selected = _a.sent();
                    if (!selected)
                        return [2 /*return*/];
                    setBusy(true);
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 5, 6, 7]);
                    return [4 /*yield*/, git_1.gitIpc.getRemoteUrl(selected)];
                case 3:
                    remoteUrl = _a.sent();
                    if (remoteUrl) {
                        parsed = parseGitHubRemote(remoteUrl);
                        if (parsed) {
                            matches = parsed.owner.toLowerCase() === currentRepo.owner.toLowerCase() &&
                                parsed.name.toLowerCase() === currentRepo.name.toLowerCase();
                            if (!matches) {
                                setError("That folder is a clone of ".concat(parsed.owner, "/").concat(parsed.name, ", not ").concat(currentRepo.fullName, ". Please select the correct folder."));
                                setBusy(false);
                                return [2 /*return*/];
                            }
                        }
                    }
                    return [4 /*yield*/, setLocalPath.mutateAsync({ repoId: currentRepo.id, localPath: selected })];
                case 4:
                    _a.sent();
                    advance();
                    return [3 /*break*/, 7];
                case 5:
                    err_1 = _a.sent();
                    setError(err_1 instanceof Error ? err_1.message : String(err_1));
                    return [3 /*break*/, 7];
                case 6:
                    setBusy(false);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); }, [currentRepo, setLocalPath]);
    var handleClone = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var dest, clonePath, url, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!currentRepo)
                        return [2 /*return*/];
                    setError(null);
                    return [4 /*yield*/, (0, plugin_dialog_1.open)({
                            directory: true,
                            title: "Choose where to clone ".concat(currentRepo.fullName),
                        })];
                case 1:
                    dest = _a.sent();
                    if (!dest)
                        return [2 /*return*/];
                    clonePath = "".concat(dest, "/").concat(currentRepo.name);
                    url = "https://github.com/".concat(currentRepo.fullName, ".git");
                    setBusy(true);
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, 5, 6]);
                    return [4 /*yield*/, cloneRepo.mutateAsync({
                            url: url,
                            localPath: clonePath,
                            repoId: currentRepo.id,
                        })];
                case 3:
                    _a.sent();
                    advance();
                    return [3 /*break*/, 6];
                case 4:
                    err_2 = _a.sent();
                    setError(err_2 instanceof Error ? err_2.message : String(err_2));
                    return [3 /*break*/, 6];
                case 5:
                    setBusy(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); }, [currentRepo, cloneRepo]);
    if (!currentRepo)
        return null;
    return (<dialog_1.Dialog open={isOpen} onOpenChange={handleClose}>
      <dialog_1.DialogContent className="sm:max-w-[440px]">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle>Set Up Repository</dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            {total > 1
            ? "Repository ".concat(currentIndex + 1, " of ").concat(total, " \u2014 Where is this repo on your machine?")
            : "Where is this repo on your machine?"}
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>

        <div className="rounded-md border px-3 py-2.5">
          <p className="text-sm font-medium">{currentRepo.fullName}</p>
          {currentRepo.isPrivate && (<p className="text-xs text-muted-foreground">Private</p>)}
        </div>

        <div className="flex flex-col gap-2">
          <button_1.Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={handleSelectLocal} disabled={busy}>
            {busy && setLocalPath.isPending ? (<lucide_react_1.Loader2 className="h-4 w-4 animate-spin shrink-0"/>) : (<lucide_react_1.FolderOpen className="h-4 w-4 shrink-0"/>)}
            <div className="text-left">
              <p className="text-sm font-medium">I already have it cloned</p>
              <p className="text-xs text-muted-foreground">Select the local folder</p>
            </div>
          </button_1.Button>

          <button_1.Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={handleClone} disabled={busy}>
            {busy && cloneRepo.isPending ? (<lucide_react_1.Loader2 className="h-4 w-4 animate-spin shrink-0"/>) : (<lucide_react_1.Download className="h-4 w-4 shrink-0"/>)}
            <div className="text-left">
              <p className="text-sm font-medium">Clone from GitHub</p>
              <p className="text-xs text-muted-foreground">Download a fresh copy</p>
            </div>
          </button_1.Button>

          <button_1.Button variant="ghost" className="justify-start gap-2 text-muted-foreground" onClick={advance} disabled={busy}>
            <lucide_react_1.SkipForward className="h-4 w-4 shrink-0"/>
            Skip for now
          </button_1.Button>
        </div>

        {error && (<div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            <lucide_react_1.AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5"/>
            <p className="text-xs text-destructive">{error}</p>
          </div>)}
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
