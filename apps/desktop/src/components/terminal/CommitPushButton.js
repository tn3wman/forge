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
exports.CommitPushButton = CommitPushButton;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var button_1 = require("@/components/ui/button");
var dropdown_menu_1 = require("@/components/ui/dropdown-menu");
var terminalStore_1 = require("@/stores/terminalStore");
var authStore_1 = require("@/stores/authStore");
var useGitStatus_1 = require("@/queries/useGitStatus");
var useGitMutations_1 = require("@/queries/useGitMutations");
var CommitMessageDialog_1 = require("./CommitMessageDialog");
var CreatePrDialog_1 = require("./CreatePrDialog");
function CommitPushButton() {
    var _this = this;
    var _a, _b;
    var _c = (0, terminalStore_1.useTerminalStore)(), tabs = _c.tabs, activeTabId = _c.activeTabId;
    var isAuthenticated = (0, authStore_1.useAuthStore)(function (s) { return s.isAuthenticated; });
    var activeTab = tabs.find(function (t) { return t.tabId === activeTabId; });
    var workingDirectory = (_a = activeTab === null || activeTab === void 0 ? void 0 : activeTab.workingDirectory) !== null && _a !== void 0 ? _a : null;
    var status = (0, useGitStatus_1.useGitStatus)(workingDirectory).data;
    var stageAll = (0, useGitMutations_1.useStageAll)();
    var commit = (0, useGitMutations_1.useCommit)();
    var push = (0, useGitMutations_1.useGitPush)();
    var _d = (0, react_1.useState)(null), dialogMode = _d[0], setDialogMode = _d[1];
    var _e = (0, react_1.useState)(false), isRunning = _e[0], setIsRunning = _e[1];
    var _f = (0, react_1.useState)(null), error = _f[0], setError = _f[1];
    var hasChanges = ((_b = status === null || status === void 0 ? void 0 : status.length) !== null && _b !== void 0 ? _b : 0) > 0;
    var isLoading = stageAll.isPending || commit.isPending || push.isPending || isRunning;
    var handleCommitAndPush = (0, react_1.useCallback)(function (message) { return __awaiter(_this, void 0, void 0, function () {
        var e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!workingDirectory)
                        return [2 /*return*/];
                    setIsRunning(true);
                    setError(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, 6, 7]);
                    return [4 /*yield*/, stageAll.mutateAsync({ path: workingDirectory })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, commit.mutateAsync({ path: workingDirectory, message: message })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, push.mutateAsync({ path: workingDirectory })];
                case 4:
                    _a.sent();
                    setDialogMode(null);
                    return [3 /*break*/, 7];
                case 5:
                    e_1 = _a.sent();
                    setError(e_1 instanceof Error ? e_1.message : String(e_1));
                    return [3 /*break*/, 7];
                case 6:
                    setIsRunning(false);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); }, [workingDirectory, stageAll, commit, push]);
    var handleCommitOnly = (0, react_1.useCallback)(function (message) { return __awaiter(_this, void 0, void 0, function () {
        var e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!workingDirectory)
                        return [2 /*return*/];
                    setIsRunning(true);
                    setError(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, stageAll.mutateAsync({ path: workingDirectory })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, commit.mutateAsync({ path: workingDirectory, message: message })];
                case 3:
                    _a.sent();
                    setDialogMode(null);
                    return [3 /*break*/, 6];
                case 4:
                    e_2 = _a.sent();
                    setError(e_2 instanceof Error ? e_2.message : String(e_2));
                    return [3 /*break*/, 6];
                case 5:
                    setIsRunning(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); }, [workingDirectory, stageAll, commit]);
    var handlePush = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var e_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!workingDirectory)
                        return [2 /*return*/];
                    setIsRunning(true);
                    setError(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, push.mutateAsync({ path: workingDirectory })];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 3:
                    e_3 = _a.sent();
                    setError(e_3 instanceof Error ? e_3.message : String(e_3));
                    return [3 /*break*/, 5];
                case 4:
                    setIsRunning(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); }, [workingDirectory, push]);
    // Don't render if no working directory (no git repo context)
    if (!workingDirectory)
        return null;
    return (<>
      <div className="inline-flex items-center">
        <button_1.Button size="sm" disabled={!hasChanges || !isAuthenticated || isLoading} onClick={function () {
            setError(null);
            setDialogMode("commit-push");
        }} className="h-6 rounded-r-none px-2 text-xs">
          <lucide_react_1.GitCommitHorizontal className="mr-1 h-3 w-3"/>
          Commit & push
        </button_1.Button>
        <dropdown_menu_1.DropdownMenu>
          <dropdown_menu_1.DropdownMenuTrigger asChild>
            <button_1.Button size="sm" disabled={isLoading} className="h-6 rounded-l-none border-l border-primary-foreground/20 px-1" aria-label="More commit options">
              <lucide_react_1.ChevronDown className="h-3 w-3"/>
            </button_1.Button>
          </dropdown_menu_1.DropdownMenuTrigger>
          <dropdown_menu_1.DropdownMenuContent align="end">
            <dropdown_menu_1.DropdownMenuItem disabled={!hasChanges} onClick={function () {
            setError(null);
            setDialogMode("commit");
        }}>
              <lucide_react_1.GitCommitHorizontal className="mr-2 h-4 w-4"/>
              Commit
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem disabled={!isAuthenticated} onClick={handlePush}>
              <lucide_react_1.Upload className="mr-2 h-4 w-4"/>
              Push
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuSeparator />
            <dropdown_menu_1.DropdownMenuItem disabled={!isAuthenticated} onClick={function () {
            setError(null);
            setDialogMode("create-pr");
        }}>
              <lucide_react_1.GitPullRequest className="mr-2 h-4 w-4"/>
              Create PR
            </dropdown_menu_1.DropdownMenuItem>
          </dropdown_menu_1.DropdownMenuContent>
        </dropdown_menu_1.DropdownMenu>
      </div>

      <CommitMessageDialog_1.CommitMessageDialog open={dialogMode === "commit-push"} onOpenChange={function (v) { return !v && setDialogMode(null); }} onConfirm={handleCommitAndPush} title="Commit & Push" isLoading={isLoading} error={error}/>

      <CommitMessageDialog_1.CommitMessageDialog open={dialogMode === "commit"} onOpenChange={function (v) { return !v && setDialogMode(null); }} onConfirm={handleCommitOnly} title="Commit" isLoading={isLoading} error={error}/>

      <CreatePrDialog_1.CreatePrDialog open={dialogMode === "create-pr"} onOpenChange={function (v) { return !v && setDialogMode(null); }} workingDirectory={workingDirectory}/>
    </>);
}
