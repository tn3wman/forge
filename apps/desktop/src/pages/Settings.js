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
exports.Settings = Settings;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var plugin_updater_1 = require("@tauri-apps/plugin-updater");
var settingsStore_1 = require("@/stores/settingsStore");
var authStore_1 = require("@/stores/authStore");
var card_1 = require("@/components/ui/card");
var RepoList_1 = require("@/components/repository/RepoList");
var AddRepoDialog_1 = require("@/components/repository/AddRepoDialog");
var useRepositories_1 = require("@/queries/useRepositories");
var workspaceStore_1 = require("@/stores/workspaceStore");
var switch_1 = require("@/components/ui/switch");
var label_1 = require("@/components/ui/label");
var separator_1 = require("@/components/ui/separator");
var button_1 = require("@/components/ui/button");
var avatar_1 = require("@/components/ui/avatar");
var GITHUB_POLL_OPTIONS = [
    { label: "30 seconds", value: 30000 },
    { label: "1 minute", value: 60000 },
    { label: "2 minutes", value: 120000 },
    { label: "5 minutes", value: 300000 },
];
var GIT_POLL_OPTIONS = [
    { label: "2 seconds", value: 2000 },
    { label: "5 seconds", value: 5000 },
    { label: "10 seconds", value: 10000 },
    { label: "30 seconds", value: 30000 },
];
function Settings() {
    var _a, _b, _c;
    var _d = (0, settingsStore_1.useSettingsStore)(), loaded = _d.loaded, loadSettings = _d.loadSettings, updateSetting = _d.updateSetting, githubPollInterval = _d.githubPollInterval, gitPollInterval = _d.gitPollInterval, showNotificationBadge = _d.showNotificationBadge, autoFetchOnSwitch = _d.autoFetchOnSwitch, claudeExecutablePath = _d.claudeExecutablePath;
    var user = (0, authStore_1.useAuthStore)(function (s) { return s.user; });
    var logout = (0, authStore_1.useAuthStore)(function (s) { return s.logout; });
    var activeWorkspaceId = (0, workspaceStore_1.useWorkspaceStore)().activeWorkspaceId;
    var repos = (0, useRepositories_1.useRepositories)(activeWorkspaceId).data;
    var _e = (0, react_1.useState)(false), showAddRepo = _e[0], setShowAddRepo = _e[1];
    var _f = (0, react_1.useState)("idle"), updateStatus = _f[0], setUpdateStatus = _f[1];
    var _g = (0, react_1.useState)(null), updateVersion = _g[0], setUpdateVersion = _g[1];
    function checkForUpdates() {
        return __awaiter(this, void 0, void 0, function () {
            var update, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        setUpdateStatus("checking");
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, plugin_updater_1.check)()];
                    case 2:
                        update = _b.sent();
                        if (update) {
                            setUpdateStatus("available");
                            setUpdateVersion(update.version);
                        }
                        else {
                            setUpdateStatus("none");
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _b.sent();
                        setUpdateStatus("error");
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    (0, react_1.useEffect)(function () {
        if (!loaded) {
            loadSettings();
        }
    }, [loaded, loadSettings]);
    return (<div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Account */}
        <card_1.Card>
          <card_1.CardHeader>
            <div className="flex items-center gap-2">
              <lucide_react_1.User className="h-4 w-4 text-muted-foreground"/>
              <card_1.CardTitle>Account</card_1.CardTitle>
            </div>
            <card_1.CardDescription>Manage your GitHub account connection</card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <avatar_1.Avatar className="h-10 w-10">
                  <avatar_1.AvatarImage src={user === null || user === void 0 ? void 0 : user.avatarUrl} alt={user === null || user === void 0 ? void 0 : user.login}/>
                  <avatar_1.AvatarFallback>{(_b = (_a = user === null || user === void 0 ? void 0 : user.login) === null || _a === void 0 ? void 0 : _a.charAt(0).toUpperCase()) !== null && _b !== void 0 ? _b : "?"}</avatar_1.AvatarFallback>
                </avatar_1.Avatar>
                <div>
                  <p className="text-sm font-medium">{(_c = user === null || user === void 0 ? void 0 : user.name) !== null && _c !== void 0 ? _c : user === null || user === void 0 ? void 0 : user.login}</p>
                  <p className="text-xs text-muted-foreground">@{user === null || user === void 0 ? void 0 : user.login}</p>
                </div>
              </div>
              <button_1.Button variant="outline" size="sm" onClick={logout}>
                Sign Out
              </button_1.Button>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        {/* Repositories */}
        <card_1.Card>
          <card_1.CardHeader>
            <div className="flex items-center gap-2">
              <lucide_react_1.FolderGit2 className="h-4 w-4 text-muted-foreground"/>
              <card_1.CardTitle>Repositories</card_1.CardTitle>
            </div>
            <card_1.CardDescription>
              Manage repositories in this workspace
            </card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-2">
            {repos && repos.length > 0 ? (<div className="space-y-0.5">
                {repos.map(function (repo) { return (<RepoList_1.RepoItem key={repo.id} repo={repo}/>); })}
              </div>) : (<p className="text-sm text-muted-foreground">
                No repositories added yet
              </p>)}
            <button_1.Button variant="outline" size="sm" onClick={function () { return setShowAddRepo(true); }} className="mt-2">
              Add Repository
            </button_1.Button>
            <AddRepoDialog_1.AddRepoDialog open={showAddRepo} onOpenChange={setShowAddRepo}/>
          </card_1.CardContent>
        </card_1.Card>

        {/* Notifications */}
        <card_1.Card>
          <card_1.CardHeader>
            <div className="flex items-center gap-2">
              <lucide_react_1.Bell className="h-4 w-4 text-muted-foreground"/>
              <card_1.CardTitle>Notifications</card_1.CardTitle>
            </div>
            <card_1.CardDescription>Configure notification preferences</card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <label_1.Label htmlFor="notification-badge">Show unread badge</label_1.Label>
              <switch_1.Switch id="notification-badge" checked={showNotificationBadge} onCheckedChange={function (checked) { return updateSetting("showNotificationBadge", checked); }}/>
            </div>
            <separator_1.Separator />
            <div className="flex items-center justify-between">
              <label_1.Label htmlFor="github-poll">GitHub poll interval</label_1.Label>
              <select id="github-poll" value={githubPollInterval} onChange={function (e) { return updateSetting("githubPollInterval", Number(e.target.value)); }} className="rounded-md border bg-background px-2 py-1 text-sm">
                {GITHUB_POLL_OPTIONS.map(function (opt) { return (<option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>); })}
              </select>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        {/* Git */}
        <card_1.Card>
          <card_1.CardHeader>
            <div className="flex items-center gap-2">
              <lucide_react_1.GitBranch className="h-4 w-4 text-muted-foreground"/>
              <card_1.CardTitle>Git</card_1.CardTitle>
            </div>
            <card_1.CardDescription>Configure local Git behavior</card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <label_1.Label htmlFor="auto-fetch">Auto-fetch on switch</label_1.Label>
              <switch_1.Switch id="auto-fetch" checked={autoFetchOnSwitch} onCheckedChange={function (checked) { return updateSetting("autoFetchOnSwitch", checked); }}/>
            </div>
            <separator_1.Separator />
            <div className="flex items-center justify-between">
              <label_1.Label htmlFor="git-poll">Git status poll interval</label_1.Label>
              <select id="git-poll" value={gitPollInterval} onChange={function (e) { return updateSetting("gitPollInterval", Number(e.target.value)); }} className="rounded-md border bg-background px-2 py-1 text-sm">
                {GIT_POLL_OPTIONS.map(function (opt) { return (<option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>); })}
              </select>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        {/* Claude Code */}
        <card_1.Card>
          <card_1.CardHeader>
            <div className="flex items-center gap-2">
              <lucide_react_1.Bot className="h-4 w-4 text-muted-foreground"/>
              <card_1.CardTitle>Claude Code</card_1.CardTitle>
            </div>
            <card_1.CardDescription>
              Override the Claude executable Forge uses for SDK-backed chat sessions
            </card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-3">
            <div className="space-y-2">
              <label_1.Label htmlFor="claude-executable-path">Executable path override</label_1.Label>
              <input id="claude-executable-path" value={claudeExecutablePath} onChange={function (e) { return updateSetting("claudeExecutablePath", e.target.value); }} placeholder="Leave empty to use the discovered claude binary from PATH" className="w-full rounded-md border bg-background px-3 py-2 text-sm"/>
            </div>
            <p className="text-xs text-muted-foreground">
              Forge uses the official Claude Agent SDK host and still requires Claude Code to be installed and authenticated locally.
            </p>
          </card_1.CardContent>
        </card_1.Card>

        {/* Updates */}
        <card_1.Card>
          <card_1.CardHeader>
            <div className="flex items-center gap-2">
              <lucide_react_1.Settings className="h-4 w-4 text-muted-foreground"/>
              <card_1.CardTitle>Updates</card_1.CardTitle>
            </div>
            <card_1.CardDescription>Check for new versions of Forge</card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                {updateStatus === "idle" && <span className="text-muted-foreground">Click to check for updates</span>}
                {updateStatus === "checking" && <span className="text-muted-foreground">Checking...</span>}
                {updateStatus === "available" && <span className="text-green-500">Version {updateVersion} available!</span>}
                {updateStatus === "none" && <span className="text-muted-foreground">You&apos;re up to date</span>}
                {updateStatus === "error" && <span className="text-destructive">Failed to check for updates</span>}
              </div>
              <button_1.Button variant="outline" size="sm" onClick={checkForUpdates} disabled={updateStatus === "checking"}>
                Check for Updates
              </button_1.Button>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        {/* About */}
        <card_1.Card>
          <card_1.CardHeader>
            <div className="flex items-center gap-2">
              <lucide_react_1.Settings className="h-4 w-4 text-muted-foreground"/>
              <card_1.CardTitle>About</card_1.CardTitle>
            </div>
          </card_1.CardHeader>
          <card_1.CardContent>
            <p className="text-sm font-medium">Forge v0.0.0</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Built with Tauri 2, React 19, and Rust
            </p>
          </card_1.CardContent>
        </card_1.Card>
      </div>
    </div>);
}
