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
exports.PreSessionView = PreSessionView;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var useCliDiscovery_1 = require("@/hooks/useCliDiscovery");
var useRepositories_1 = require("@/queries/useRepositories");
var useGitBranches_1 = require("@/queries/useGitBranches");
var useGitWorktrees_1 = require("@/queries/useGitWorktrees");
var terminalStore_1 = require("@/stores/terminalStore");
var agentStore_1 = require("@/stores/agentStore");
var settingsStore_1 = require("@/stores/settingsStore");
var agent_1 = require("@/ipc/agent");
var agentPersistence_1 = require("@/lib/agentPersistence");
var git_1 = require("@/ipc/git");
var terminal_1 = require("@/ipc/terminal");
var UnifiedInputCard_1 = require("./UnifiedInputCard");
var WorkModeSelector_1 = require("./WorkModeSelector");
var RepoSetupBar_1 = require("./RepoSetupBar");
var AgentRepoSelector_1 = require("./AgentRepoSelector");
var FullAccessConfirmDialog_1 = require("./FullAccessConfirmDialog");
function PreSessionView(_a) {
    var _this = this;
    var _b, _c, _d, _e, _f;
    var tabId = _a.tabId, workspaceId = _a.workspaceId;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _g = (0, useCliDiscovery_1.useCliDiscovery)(), clis = _g.data, clisLoading = _g.isLoading;
    var repos = (0, useRepositories_1.useRepositories)(workspaceId).data;
    var tab = (0, terminalStore_1.useTerminalStore)(function (s) { return s.tabs.find(function (t) { return t.tabId === tabId; }); });
    var reposWithPath = (_b = repos === null || repos === void 0 ? void 0 : repos.filter(function (r) { return !!r.localPath; })) !== null && _b !== void 0 ? _b : [];
    var _h = (0, react_1.useState)(null), selectedRepoId = _h[0], setSelectedRepoId = _h[1];
    // Resolve working directory: tab override > selected repo > first linked repo
    var selectedRepo = (_c = reposWithPath.find(function (r) { return r.id === selectedRepoId; })) !== null && _c !== void 0 ? _c : reposWithPath[0];
    var workingDirectory = (_e = (_d = tab === null || tab === void 0 ? void 0 : tab.workingDirectory) !== null && _d !== void 0 ? _d : selectedRepo === null || selectedRepo === void 0 ? void 0 : selectedRepo.localPath) !== null && _e !== void 0 ? _e : undefined;
    var _j = (0, react_1.useState)(null), selectedCli = _j[0], setSelectedCli = _j[1];
    var _k = (0, react_1.useState)("assisted"), mode = _k[0], setMode = _k[1];
    var _l = (0, react_1.useState)(false), planMode = _l[0], setPlanMode = _l[1];
    var _m = (0, react_1.useState)(false), showFullAccessConfirm = _m[0], setShowFullAccessConfirm = _m[1];
    var _o = (0, react_1.useState)(false), creating = _o[0], setCreating = _o[1];
    var _p = (0, react_1.useState)(""), model = _p[0], setModel = _p[1];
    var _q = (0, react_1.useState)(""), agent = _q[0], setAgent = _q[1];
    var _r = (0, react_1.useState)("medium"), effort = _r[0], setEffort = _r[1];
    var _s = (0, react_1.useState)(null), launchError = _s[0], setLaunchError = _s[1];
    var claudeExecutablePath = (0, settingsStore_1.useSettingsStore)(function (s) { return s.claudeExecutablePath; });
    // Work mode & branch/worktree selection
    var _t = (0, react_1.useState)("local"), workMode = _t[0], setWorkMode = _t[1];
    var _u = (0, react_1.useState)(null), selectedBranch = _u[0], setSelectedBranch = _u[1];
    var _v = (0, react_1.useState)(null), selectedWorktree = _v[0], setSelectedWorktree = _v[1];
    var _w = (0, useGitBranches_1.useGitBranches)(workingDirectory !== null && workingDirectory !== void 0 ? workingDirectory : null), branches = _w.data, branchesLoading = _w.isLoading;
    var currentBranch = (0, useGitBranches_1.useCurrentBranch)(workingDirectory !== null && workingDirectory !== void 0 ? workingDirectory : null).data;
    var _x = (0, useGitWorktrees_1.useGitWorktrees)(workingDirectory !== null && workingDirectory !== void 0 ? workingDirectory : null), worktrees = _x.data, worktreesLoading = _x.isLoading;
    // Auto-select default branch for "new worktree" mode
    (0, react_1.useEffect)(function () {
        var _a, _b;
        if (branches && branches.length > 0 && !selectedBranch) {
            var defaultBranch = (_b = (_a = branches.find(function (b) { return !b.isRemote && (b.name === "main" || b.name === "master"); })) !== null && _a !== void 0 ? _a : branches.find(function (b) { return !b.isRemote && b.isHead; })) !== null && _b !== void 0 ? _b : branches.find(function (b) { return !b.isRemote; });
            if (defaultBranch) {
                setSelectedBranch(defaultBranch.name);
            }
        }
    }, [branches, selectedBranch]);
    var handleModeChange = (0, react_1.useCallback)(function (newMode) {
        if (newMode === "fullAccess" && mode !== "fullAccess") {
            setShowFullAccessConfirm(true);
        }
        else {
            setMode(newMode);
        }
    }, [mode]);
    var slashCommands = (0, useCliDiscovery_1.useSlashCommands)(selectedCli).data;
    var selectedCliInfo = clis === null || clis === void 0 ? void 0 : clis.find(function (cli) { return cli.name === selectedCli; });
    var isClaude = selectedCli === "claude";
    var effectiveClaudePath = claudeExecutablePath.trim() || (selectedCliInfo === null || selectedCliInfo === void 0 ? void 0 : selectedCliInfo.path) || "";
    // Auto-select first CLI when discovered
    (0, react_1.useEffect)(function () {
        if (clis && clis.length > 0 && !selectedCli) {
            setSelectedCli(clis[0].name);
        }
    }, [clis, selectedCli]);
    var handleSend = (0, react_1.useCallback)(function (text) { return __awaiter(_this, void 0, void 0, function () {
        var effectiveWorkDir, wt, session, userMsg, persisted, err_1;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        return __generator(this, function (_p) {
            switch (_p.label) {
                case 0:
                    if (!selectedCli || creating)
                        return [2 /*return*/];
                    setCreating(true);
                    setLaunchError(null);
                    _p.label = 1;
                case 1:
                    _p.trys.push([1, 6, , 7]);
                    effectiveWorkDir = workingDirectory;
                    if (!(workMode === "new-worktree" && selectedBranch && workingDirectory)) return [3 /*break*/, 3];
                    return [4 /*yield*/, git_1.gitIpc.createWorktree(workingDirectory, selectedBranch)];
                case 2:
                    wt = _p.sent();
                    effectiveWorkDir = wt.path;
                    return [3 /*break*/, 4];
                case 3:
                    if (workMode === "existing-worktree" && selectedWorktree) {
                        effectiveWorkDir = selectedWorktree.path;
                    }
                    _p.label = 4;
                case 4: return [4 /*yield*/, agent_1.agentIpc.createSession({
                        cliName: selectedCli,
                        mode: mode,
                        workingDirectory: effectiveWorkDir,
                        workspaceId: workspaceId,
                        initialPrompt: text,
                        planMode: planMode,
                        claude: isClaude
                            ? {
                                provider: "claude",
                                model: model.trim() || undefined,
                                permissionMode: mode,
                                effort: effort,
                                planMode: planMode,
                                agent: agent.trim() || undefined,
                                claudePath: effectiveClaudePath || undefined,
                            }
                            : undefined,
                    })];
                case 5:
                    session = _p.sent();
                    terminalStore_1.useTerminalStore.getState().activateTab(tabId, session.id, {
                        label: session.displayName,
                        cliName: session.cliName,
                        type: "chat",
                    });
                    agentStore_1.useAgentStore.getState().addTab({
                        sessionId: session.id,
                        label: session.displayName,
                        cliName: session.cliName,
                        mode: mode,
                        state: "thinking",
                        conversationId: (_a = session.conversationId) !== null && _a !== void 0 ? _a : null,
                        provider: (_b = session.provider) !== null && _b !== void 0 ? _b : (isClaude ? "claude" : undefined),
                        model: (_c = session.model) !== null && _c !== void 0 ? _c : (model.trim() || undefined),
                        permissionMode: (_d = session.permissionMode) !== null && _d !== void 0 ? _d : (isClaude ? mode : undefined),
                        agent: (_e = session.agent) !== null && _e !== void 0 ? _e : (agent.trim() || undefined),
                        effort: (_f = session.effort) !== null && _f !== void 0 ? _f : (isClaude ? effort : undefined),
                        claudePath: (_g = session.claudePath) !== null && _g !== void 0 ? _g : (effectiveClaudePath || undefined),
                        capabilitiesLoaded: session.capabilitiesLoaded,
                        planMode: planMode,
                        totalCost: 0,
                    });
                    userMsg = {
                        id: "user-".concat(Date.now()),
                        type: "user",
                        content: text,
                        timestamp: Date.now(),
                        collapsed: false,
                    };
                    agentStore_1.useAgentStore.getState().appendMessage(session.id, userMsg);
                    agentStore_1.useAgentStore.getState().createPendingAssistant(session.id);
                    // Persist session and initial user message
                    {
                        persisted = (0, agentPersistence_1.sessionInfoToPersistedSession)(session.id, workspaceId, session.cliName, session.displayName, mode, {
                            provider: (_h = session.provider) !== null && _h !== void 0 ? _h : (isClaude ? "claude" : undefined),
                            model: (_j = session.model) !== null && _j !== void 0 ? _j : (model.trim() || undefined),
                            permissionMode: (_k = session.permissionMode) !== null && _k !== void 0 ? _k : (isClaude ? mode : undefined),
                            agent: (_l = session.agent) !== null && _l !== void 0 ? _l : (agent.trim() || undefined),
                            effort: (_m = session.effort) !== null && _m !== void 0 ? _m : (isClaude ? effort : undefined),
                            claudePath: (_o = session.claudePath) !== null && _o !== void 0 ? _o : (effectiveClaudePath || undefined),
                            planMode: planMode,
                            workingDirectory: effectiveWorkDir,
                            conversationId: session.conversationId,
                            createdAt: session.createdAt,
                        });
                        void agent_1.agentIpc.persistSession(persisted).catch(function (err) {
                            console.error("Failed to persist session:", err);
                        });
                        (0, agentPersistence_1.persistSingleMessage)(session.id, userMsg);
                    }
                    return [3 /*break*/, 7];
                case 6:
                    err_1 = _p.sent();
                    console.error("Failed to create agent session:", err_1);
                    setLaunchError(err_1 instanceof Error ? err_1.message : String(err_1));
                    setCreating(false);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    }); }, [
        agent,
        claudeExecutablePath,
        creating,
        effectiveClaudePath,
        effort,
        isClaude,
        mode,
        model,
        planMode,
        selectedBranch,
        selectedCli,
        selectedWorktree,
        tabId,
        workMode,
        workingDirectory,
        workspaceId,
    ]);
    var handleUnlockWorktree = (0, react_1.useCallback)(function (wt) { return __awaiter(_this, void 0, void 0, function () {
        var err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!workingDirectory)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, git_1.gitIpc.unlockWorktree(workingDirectory, wt.name)];
                case 2:
                    _a.sent();
                    queryClient.invalidateQueries({ queryKey: ["git-worktrees", workingDirectory] });
                    return [3 /*break*/, 4];
                case 3:
                    err_2 = _a.sent();
                    console.error("Failed to unlock worktree:", err_2);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); }, [workingDirectory, queryClient]);
    var handleOpenTerminal = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var cliName, isCli, estimatedCols, estimatedRows, session, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (creating)
                        return [2 /*return*/];
                    setCreating(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    cliName = selectedCli !== null && selectedCli !== void 0 ? selectedCli : "bash";
                    isCli = cliName === "claude" || cliName === "codex";
                    estimatedCols = Math.max(80, Math.floor((window.innerWidth - 100) / 7.8));
                    estimatedRows = Math.max(24, Math.floor((window.innerHeight - 200) / 17));
                    return [4 /*yield*/, terminal_1.terminalIpc.createSession({
                            cliName: cliName,
                            mode: "Normal",
                            workspaceId: workspaceId,
                            workingDirectory: workingDirectory,
                            permissionMode: isCli ? mode : undefined,
                            planMode: isCli ? planMode : undefined,
                            initialCols: estimatedCols,
                            initialRows: estimatedRows,
                        })];
                case 2:
                    session = _a.sent();
                    terminalStore_1.useTerminalStore.getState().activateTab(tabId, session.id, {
                        label: session.displayName,
                        cliName: session.cliName,
                        type: "terminal",
                        mode: session.mode,
                    });
                    return [3 /*break*/, 4];
                case 3:
                    err_3 = _a.sent();
                    console.error("Failed to create terminal session:", err_3);
                    setCreating(false);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); }, [selectedCli, workspaceId, workingDirectory, tabId, creating, mode, planMode]);
    return (<div className="flex h-full flex-col">
      {/* Spacer pushes input to bottom */}
      <div className="flex-1"/>

      <div className="flex justify-center pb-4">
        <p className="text-sm text-muted-foreground/50">
          Send a message to start the conversation.
        </p>
      </div>

      {launchError && (<div className="mx-4 mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {launchError}
        </div>)}

      <div className="shrink-0">
        <UnifiedInputCard_1.UnifiedInputCard onSend={handleSend} disabled={creating} mode={mode} onModeChange={handleModeChange} planMode={planMode} onPlanModeChange={setPlanMode} slashCommands={slashCommands !== null && slashCommands !== void 0 ? slashCommands : []} model={isClaude ? model : undefined} onModelChange={isClaude ? setModel : undefined} effort={isClaude ? effort : undefined} onEffortChange={isClaude ? setEffort : undefined} showAgentSelector clis={clis !== null && clis !== void 0 ? clis : []} selectedCli={selectedCli} onSelectCli={setSelectedCli} clisLoading={clisLoading} showTerminalButton onOpenTerminal={handleOpenTerminal}/>

        {reposWithPath.length > 1 && (<AgentRepoSelector_1.AgentRepoSelector repos={reposWithPath} selectedRepoId={(_f = selectedRepo === null || selectedRepo === void 0 ? void 0 : selectedRepo.id) !== null && _f !== void 0 ? _f : null} onSelect={setSelectedRepoId}/>)}

        {workingDirectory ? (<WorkModeSelector_1.WorkModeSelector workMode={workMode} onWorkModeChange={setWorkMode} currentBranch={currentBranch !== null && currentBranch !== void 0 ? currentBranch : null} branches={branches !== null && branches !== void 0 ? branches : []} branchesLoading={branchesLoading} selectedBranch={selectedBranch} onBranchChange={setSelectedBranch} worktrees={worktrees !== null && worktrees !== void 0 ? worktrees : []} worktreesLoading={worktreesLoading} selectedWorktree={selectedWorktree} onWorktreeChange={setSelectedWorktree} onUnlockWorktree={handleUnlockWorktree} disabled={creating}/>) : (<RepoSetupBar_1.RepoSetupBar workspaceId={workspaceId} repos={repos !== null && repos !== void 0 ? repos : []} disabled={creating}/>)}
      </div>

      <FullAccessConfirmDialog_1.FullAccessConfirmDialog open={showFullAccessConfirm} onConfirm={function () {
            setMode("fullAccess");
            setShowFullAccessConfirm(false);
        }} onCancel={function () { return setShowFullAccessConfirm(false); }}/>
    </div>);
}
