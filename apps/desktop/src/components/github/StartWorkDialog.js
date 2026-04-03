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
exports.StartWorkDialog = StartWorkDialog;
var react_1 = require("react");
var dialog_1 = require("@/components/ui/dialog");
var button_1 = require("@/components/ui/button");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var useStartWork_1 = require("@/hooks/useStartWork");
var useRepositories_1 = require("@/queries/useRepositories");
var useGitBranches_1 = require("@/queries/useGitBranches");
var useGitWorktrees_1 = require("@/queries/useGitWorktrees");
var useIssueDetail_1 = require("@/queries/useIssueDetail");
var workspaceStore_1 = require("@/stores/workspaceStore");
var terminalStore_1 = require("@/stores/terminalStore");
var authStore_1 = require("@/stores/authStore");
var git_1 = require("@/ipc/git");
var PROGRESS_STEPS = [
    { key: "fetching", label: "Syncing remote refs", icon: lucide_react_1.RefreshCw },
    { key: "creating-branch", label: "Creating branch", icon: lucide_react_1.GitBranch },
    { key: "creating-worktree", label: "Creating worktree", icon: lucide_react_1.FolderTree },
    { key: "pushing", label: "Pushing to remote", icon: lucide_react_1.Upload },
    { key: "creating-pr", label: "Creating draft PR", icon: lucide_react_1.GitPullRequest },
];
function getStepIndex(step) {
    return PROGRESS_STEPS.findIndex(function (s) { return s.key === step; });
}
function StartWorkDialog(_a) {
    var _this = this;
    var _b, _c;
    var open = _a.open, onOpenChange = _a.onOpenChange, issue = _a.issue, linkedPrs = _a.linkedPrs;
    var activeWorkspaceId = (0, workspaceStore_1.useWorkspaceStore)().activeWorkspaceId;
    var repos = (0, useRepositories_1.useRepositories)(activeWorkspaceId).data;
    var isAuthenticated = (0, authStore_1.useAuthStore)(function (s) { return s.isAuthenticated; });
    // Find the repo for this issue
    var repo = (0, react_1.useMemo)(function () { return repos === null || repos === void 0 ? void 0 : repos.find(function (r) { return r.fullName === issue.repoFullName; }); }, [repos, issue.repoFullName]);
    var _d = (0, react_1.useMemo)(function () { return (issue.repoFullName ? issue.repoFullName.split("/") : [null, null]); }, [issue.repoFullName]), owner = _d[0], repoName = _d[1];
    var _e = (0, react_1.useState)(""), baseBranch = _e[0], setBaseBranch = _e[1];
    var _f = (0, react_1.useState)("configure"), phase = _f[0], setPhase = _f[1];
    var _g = (0, react_1.useState)(false), syncNeeded = _g[0], setSyncNeeded = _g[1];
    var _h = (0, react_1.useState)(false), syncing = _h[0], setSyncing = _h[1];
    var branches = (0, useGitBranches_1.useGitBranches)((_b = repo === null || repo === void 0 ? void 0 : repo.localPath) !== null && _b !== void 0 ? _b : null).data;
    var worktrees = (0, useGitWorktrees_1.useGitWorktrees)((_c = repo === null || repo === void 0 ? void 0 : repo.localPath) !== null && _c !== void 0 ? _c : null).data;
    // Fetch issue detail — uses CrossReferencedEvent which catches ALL referencing PRs,
    // not just those with closingIssuesReferences
    var issueDetail = (0, useIssueDetail_1.useIssueDetail)(owner, repoName, issue.number).data;
    var _j = (0, useStartWork_1.useStartWork)(), step = _j.step, error = _j.error, result = _j.result, execute = _j.execute, reset = _j.reset;
    var branchName = "forge/issue-".concat(issue.number);
    // Detect existing worktree by matching ALL linked PR branches and the forge naming pattern
    var existingWorktree = (0, react_1.useMemo)(function () {
        if (!worktrees)
            return undefined;
        // Collect all known branch names associated with this issue
        var knownBranches = new Set();
        knownBranches.add(branchName); // forge/issue-{N} pattern
        // From the list-view linked PRs (closingIssuesReferences on the PR side)
        if (linkedPrs) {
            for (var _i = 0, linkedPrs_1 = linkedPrs; _i < linkedPrs_1.length; _i++) {
                var pr = linkedPrs_1[_i];
                if (pr.headRef)
                    knownBranches.add(pr.headRef);
            }
        }
        // From issue detail's linked PRs (CrossReferencedEvent — catches ALL referencing PRs)
        if (issueDetail === null || issueDetail === void 0 ? void 0 : issueDetail.linkedPullRequests) {
            for (var _a = 0, _b = issueDetail.linkedPullRequests; _a < _b.length; _a++) {
                var pr = _b[_a];
                if (pr.headRef)
                    knownBranches.add(pr.headRef);
            }
        }
        return worktrees.find(function (wt) { return !wt.isMain && wt.branch && knownBranches.has(wt.branch); });
    }, [worktrees, branchName, linkedPrs, issueDetail]);
    // Set default base branch
    (0, react_1.useEffect)(function () {
        if ((repo === null || repo === void 0 ? void 0 : repo.defaultBranch) && !baseBranch) {
            setBaseBranch(repo.defaultBranch);
        }
    }, [repo === null || repo === void 0 ? void 0 : repo.defaultBranch, baseBranch]);
    // Check if local base branch is behind remote
    (0, react_1.useEffect)(function () {
        if (!branches || !baseBranch)
            return;
        var local = branches.find(function (b) { return b.name === baseBranch && !b.isRemote; });
        var remote = branches.find(function (b) { return b.name === "origin/".concat(baseBranch) && b.isRemote; });
        if (local && remote && local.commitOid !== remote.commitOid) {
            setSyncNeeded(true);
        }
        else {
            setSyncNeeded(false);
        }
    }, [branches, baseBranch]);
    // Track step changes → update phase
    (0, react_1.useEffect)(function () {
        if (step === "done")
            setPhase("done");
        else if (step === "error")
            setPhase("error");
        else if (step !== "idle")
            setPhase("creating");
    }, [step]);
    // Reset when dialog opens
    (0, react_1.useEffect)(function () {
        var _a;
        if (open) {
            reset();
            setPhase("configure");
            setBaseBranch((_a = repo === null || repo === void 0 ? void 0 : repo.defaultBranch) !== null && _a !== void 0 ? _a : "");
        }
    }, [open, reset, repo === null || repo === void 0 ? void 0 : repo.defaultBranch]);
    var hasLinkedPr = linkedPrs && linkedPrs.length > 0;
    var handleSync = function () { return __awaiter(_this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!(repo === null || repo === void 0 ? void 0 : repo.localPath) || !isAuthenticated)
                        return [2 /*return*/];
                    setSyncing(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, git_1.gitIpc.pull(repo.localPath, "origin", baseBranch)];
                case 2:
                    _b.sent();
                    setSyncNeeded(false);
                    return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    return [3 /*break*/, 4];
                case 4:
                    setSyncing(false);
                    return [2 /*return*/];
            }
        });
    }); };
    var handleStart = function () { return __awaiter(_this, void 0, void 0, function () {
        var finalResult;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(repo === null || repo === void 0 ? void 0 : repo.localPath) || !owner || !repoName)
                        return [2 /*return*/];
                    setPhase("creating");
                    return [4 /*yield*/, execute({
                            repoLocalPath: repo.localPath,
                            owner: owner,
                            repo: repoName,
                            baseBranch: baseBranch,
                            issueNumber: issue.number,
                            issueTitle: issue.title,
                        })];
                case 1:
                    finalResult = _a.sent();
                    // Auto-open terminal on success
                    if (finalResult && activeWorkspaceId) {
                        terminalStore_1.useTerminalStore.getState().addPreSessionTab(activeWorkspaceId, {
                            label: finalResult.branchName,
                            workingDirectory: finalResult.worktreePath,
                        });
                        workspaceStore_1.useWorkspaceStore.getState().setActivePage("home");
                        onOpenChange(false);
                    }
                    return [2 /*return*/];
            }
        });
    }); };
    var handleResume = function () {
        var _a;
        if (!existingWorktree || !activeWorkspaceId)
            return;
        terminalStore_1.useTerminalStore.getState().addPreSessionTab(activeWorkspaceId, {
            label: (_a = existingWorktree.branch) !== null && _a !== void 0 ? _a : branchName,
            workingDirectory: existingWorktree.path,
        });
        workspaceStore_1.useWorkspaceStore.getState().setActivePage("home");
        onOpenChange(false);
    };
    var handleRetry = function () {
        reset();
        setPhase("configure");
    };
    var localBranches = (0, react_1.useMemo)(function () { var _a; return (_a = branches === null || branches === void 0 ? void 0 : branches.filter(function (b) { return !b.isRemote; })) !== null && _a !== void 0 ? _a : []; }, [branches]);
    var noLocalPath = !(repo === null || repo === void 0 ? void 0 : repo.localPath);
    return (<dialog_1.Dialog open={open} onOpenChange={onOpenChange}>
      <dialog_1.DialogContent className="sm:max-w-md">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle className="text-base">Start Work</dialog_1.DialogTitle>
          <dialog_1.DialogDescription className="text-xs">
            #{issue.number} {issue.title}
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>

        {/* No local path */}
        {noLocalPath && (<div className="flex flex-col items-center gap-2 py-4 text-center">
            <lucide_react_1.AlertCircle className="h-8 w-8 text-muted-foreground"/>
            <p className="text-sm text-muted-foreground">
              Repository not cloned locally. Clone it first from the repo settings.
            </p>
          </div>)}

        {/* Configure phase */}
        {!noLocalPath && phase === "configure" && (<div className="space-y-4">
            {/* Existing worktree detected */}
            {existingWorktree && (<div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 space-y-2">
                <div className="flex items-start gap-2">
                  <lucide_react_1.FolderTree className="h-4 w-4 text-blue-400 shrink-0 mt-0.5"/>
                  <div className="flex-1">
                    <p className="text-xs text-blue-400 font-medium">Existing worktree found</p>
                    <p className="text-[10px] text-blue-400/70 mt-0.5">
                      Branch <code className="font-mono">{existingWorktree.branch}</code> has a worktree at{" "}
                      <code className="font-mono">{existingWorktree.path}</code>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button_1.Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={handleResume}>
                    Open Terminal
                  </button_1.Button>
                </div>
              </div>)}

            {/* Existing linked PR notice */}
            {hasLinkedPr && (<div className="rounded-md border border-border bg-accent/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  This issue already has {linkedPrs.length} linked PR(s). Starting work will create a new branch and PR.
                </p>
              </div>)}

            {/* Base branch selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Base branch</label>
              <select value={baseBranch} onChange={function (e) { return setBaseBranch(e.target.value); }} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring">
                {localBranches.map(function (b) { return (<option key={b.name} value={b.name}>
                    {b.name}
                  </option>); })}
              </select>
            </div>

            {/* Sync warning */}
            {syncNeeded && (<div className="flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
                <lucide_react_1.AlertCircle className="h-4 w-4 text-yellow-500 shrink-0"/>
                <p className="text-xs text-yellow-500 flex-1">
                  Local branch is behind remote.
                </p>
                <button_1.Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="h-6 text-[10px]">
                  {syncing ? <lucide_react_1.Loader2 className="h-3 w-3 animate-spin"/> : "Sync"}
                </button_1.Button>
              </div>)}

            {/* Branch preview */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">New branch</label>
              <div className="flex items-center gap-2 rounded-md border border-border bg-accent/30 px-3 py-1.5">
                <lucide_react_1.GitBranch className="h-3.5 w-3.5 text-muted-foreground"/>
                <code className="text-xs font-mono">{branchName}</code>
              </div>
            </div>

            {/* Start button */}
            <div className="flex justify-end">
              <button_1.Button size="sm" onClick={handleStart}>
                Start Work
              </button_1.Button>
            </div>
          </div>)}

        {/* Creating phase */}
        {!noLocalPath && (phase === "creating" || phase === "done") && (<div className="space-y-2 py-2">
            {PROGRESS_STEPS.map(function (ps, i) {
                var currentIdx = getStepIndex(step);
                var isDone = phase === "done" || i < currentIdx;
                var isActive = i === currentIdx && phase === "creating";
                var isPending = i > currentIdx && phase !== "done";
                var Icon = ps.icon;
                return (<div key={ps.key} className="flex items-center gap-3 px-1">
                  <div className="w-5 h-5 flex items-center justify-center">
                    {isDone && <lucide_react_1.Check className="h-4 w-4 text-green-400"/>}
                    {isActive && <lucide_react_1.Loader2 className="h-4 w-4 animate-spin text-blue-400"/>}
                    {isPending && <Icon className="h-4 w-4 text-muted-foreground/40"/>}
                  </div>
                  <span className={(0, utils_1.cn)("text-sm", isDone && "text-foreground", isActive && "text-foreground font-medium", isPending && "text-muted-foreground/50")}>
                    {ps.label}
                  </span>
                </div>);
            })}

            {/* Done summary */}
            {phase === "done" && result && (<div className="mt-4 space-y-2 rounded-md border border-border bg-accent/30 p-3">
                <div className="flex items-center gap-2 text-xs">
                  <lucide_react_1.GitBranch className="h-3.5 w-3.5 text-muted-foreground"/>
                  <code className="font-mono">{result.branchName}</code>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <lucide_react_1.GitPullRequest className="h-3.5 w-3.5 text-muted-foreground"/>
                  <span>Draft PR #{result.prNumber}</span>
                  {result.prUrl && (<a href={result.prUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-0.5" onClick={function (e) { return e.stopPropagation(); }}>
                      <lucide_react_1.ExternalLink className="h-3 w-3"/>
                    </a>)}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Terminal opened with worktree at {result.worktreePath}
                </p>
              </div>)}
          </div>)}

        {/* Error phase */}
        {phase === "error" && (<div className="space-y-3 py-2">
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
              <lucide_react_1.AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5"/>
              <p className="text-xs text-red-400">{error}</p>
            </div>
            <div className="flex justify-end">
              <button_1.Button variant="outline" size="sm" onClick={handleRetry}>
                Try Again
              </button_1.Button>
            </div>
          </div>)}
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
