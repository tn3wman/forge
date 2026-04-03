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
exports.useStartWork = useStartWork;
var react_1 = require("react");
var git_1 = require("@/ipc/git");
var github_1 = require("@/ipc/github");
var authStore_1 = require("@/stores/authStore");
function useStartWork() {
    var _this = this;
    var isAuthenticated = (0, authStore_1.useAuthStore)(function (s) { return s.isAuthenticated; });
    var _a = (0, react_1.useState)("idle"), step = _a[0], setStep = _a[1];
    var _b = (0, react_1.useState)(null), error = _b[0], setError = _b[1];
    var _c = (0, react_1.useState)(null), result = _c[0], setResult = _c[1];
    var reset = (0, react_1.useCallback)(function () {
        setStep("idle");
        setError(null);
        setResult(null);
    }, []);
    var execute = (0, react_1.useCallback)(function (config) { return __awaiter(_this, void 0, void 0, function () {
        var branchName, e_1, msg, worktree, e_2, msg, prBody, pr, finalResult, e_3, msg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!isAuthenticated) {
                        setError("Not authenticated");
                        setStep("error");
                        return [2 /*return*/];
                    }
                    branchName = "forge/issue-".concat(config.issueNumber);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 14, , 15]);
                    // Step 1: Fetch remote to ensure we have latest refs
                    setStep("fetching");
                    return [4 /*yield*/, git_1.gitIpc.fetch(config.repoLocalPath)];
                case 2:
                    _a.sent();
                    // Step 2: Create branch from base
                    setStep("creating-branch");
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, git_1.gitIpc.createBranch(config.repoLocalPath, branchName, "origin/".concat(config.baseBranch))];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 5:
                    e_1 = _a.sent();
                    msg = e_1 instanceof Error ? e_1.message : String(e_1);
                    // If branch already exists, that's OK — we'll reuse it
                    if (!msg.includes("already exists")) {
                        throw e_1;
                    }
                    return [3 /*break*/, 6];
                case 6:
                    // Step 3: Create worktree
                    setStep("creating-worktree");
                    return [4 /*yield*/, git_1.gitIpc.createWorktree(config.repoLocalPath, branchName)];
                case 7:
                    worktree = _a.sent();
                    // Step 3.5: Create an initial empty commit so the branch diverges from base
                    // (GitHub rejects PRs with no commits between head and base)
                    return [4 /*yield*/, git_1.gitIpc.commit(worktree.path, "chore: start work on #".concat(config.issueNumber))];
                case 8:
                    // Step 3.5: Create an initial empty commit so the branch diverges from base
                    // (GitHub rejects PRs with no commits between head and base)
                    _a.sent();
                    // Step 4: Push branch to remote
                    setStep("pushing");
                    _a.label = 9;
                case 9:
                    _a.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, git_1.gitIpc.push(worktree.path, "origin", branchName)];
                case 10:
                    _a.sent();
                    return [3 /*break*/, 12];
                case 11:
                    e_2 = _a.sent();
                    msg = e_2 instanceof Error ? e_2.message : String(e_2);
                    // If branch already exists on remote, that's OK
                    if (!msg.includes("already exists") && !msg.includes("up to date")) {
                        throw e_2;
                    }
                    return [3 /*break*/, 12];
                case 12:
                    // Step 5: Create draft PR
                    setStep("creating-pr");
                    prBody = "Closes #".concat(config.issueNumber, "\n\n_Created via Forge Start Work._");
                    return [4 /*yield*/, github_1.githubIpc.createPr(config.owner, config.repo, config.issueTitle, prBody, branchName, config.baseBranch, true)];
                case 13:
                    pr = _a.sent();
                    finalResult = {
                        branchName: branchName,
                        worktreePath: worktree.path,
                        prNumber: pr.number,
                        prUrl: pr.htmlUrl,
                    };
                    setResult(finalResult);
                    setStep("done");
                    return [2 /*return*/, finalResult];
                case 14:
                    e_3 = _a.sent();
                    msg = e_3 instanceof Error ? e_3.message : String(e_3);
                    setError(msg);
                    setStep("error");
                    return [2 /*return*/, undefined];
                case 15: return [2 /*return*/];
            }
        });
    }); }, [isAuthenticated]);
    return { step: step, error: error, result: result, execute: execute, reset: reset };
}
