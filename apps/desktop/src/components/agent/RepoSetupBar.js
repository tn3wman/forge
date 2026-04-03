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
exports.RepoSetupBar = RepoSetupBar;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var plugin_dialog_1 = require("@tauri-apps/plugin-dialog");
var dialog_1 = require("@/components/ui/dialog");
var authStore_1 = require("@/stores/authStore");
var repository_1 = require("@/ipc/repository");
var git_1 = require("@/ipc/git");
var useGitMutations_1 = require("@/queries/useGitMutations");
var react_query_1 = require("@tanstack/react-query");
var utils_1 = require("@/lib/utils");
function parseGitHubRemote(url) {
    var match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    return match ? { owner: match[1], name: match[2] } : null;
}
function RepoSetupBar(_a) {
    var _this = this;
    var workspaceId = _a.workspaceId, repos = _a.repos, disabled = _a.disabled;
    var isAuthenticated = (0, authStore_1.useAuthStore)(function (s) { return s.isAuthenticated; });
    var setLocalPath = (0, useGitMutations_1.useSetLocalPath)();
    var cloneRepo = (0, useGitMutations_1.useCloneRepo)();
    var queryClient = (0, react_query_1.useQueryClient)();
    var _b = (0, react_1.useState)(false), cloneOpen = _b[0], setCloneOpen = _b[1];
    var _c = (0, react_1.useState)(""), searchQuery = _c[0], setSearchQuery = _c[1];
    var _d = (0, react_1.useState)([]), searchResults = _d[0], setSearchResults = _d[1];
    var _e = (0, react_1.useState)(false), searching = _e[0], setSearching = _e[1];
    var _f = (0, react_1.useState)(false), cloning = _f[0], setCloning = _f[1];
    var _g = (0, react_1.useState)(null), error = _g[0], setError = _g[1];
    var unlinkedRepo = repos.find(function (r) { return !r.localPath; });
    var handleSelectLocal = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var selected, remoteUrl, parsed_1, matchingRepo, parsed, dirName, owner, name_1, newRepo, err_1;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    setError(null);
                    return [4 /*yield*/, (0, plugin_dialog_1.open)({
                            directory: true,
                            title: "Select a local Git repository",
                        })];
                case 1:
                    selected = _d.sent();
                    if (!selected)
                        return [2 /*return*/];
                    _d.label = 2;
                case 2:
                    _d.trys.push([2, 5, , 6]);
                    return [4 /*yield*/, git_1.gitIpc.getRemoteUrl(selected)];
                case 3:
                    remoteUrl = _d.sent();
                    if (remoteUrl) {
                        parsed_1 = parseGitHubRemote(remoteUrl);
                        if (parsed_1) {
                            matchingRepo = repos.find(function (r) {
                                return r.owner.toLowerCase() === parsed_1.owner.toLowerCase() &&
                                    r.name.toLowerCase() === parsed_1.name.toLowerCase();
                            });
                            if (matchingRepo) {
                                setLocalPath.mutate({ repoId: matchingRepo.id, localPath: selected });
                                return [2 /*return*/];
                            }
                        }
                    }
                    if (unlinkedRepo) {
                        setLocalPath.mutate({ repoId: unlinkedRepo.id, localPath: selected });
                        return [2 /*return*/];
                    }
                    parsed = remoteUrl ? parseGitHubRemote(remoteUrl) : null;
                    dirName = (_a = selected.split("/").pop()) !== null && _a !== void 0 ? _a : "repo";
                    owner = (_b = parsed === null || parsed === void 0 ? void 0 : parsed.owner) !== null && _b !== void 0 ? _b : "local";
                    name_1 = (_c = parsed === null || parsed === void 0 ? void 0 : parsed.name) !== null && _c !== void 0 ? _c : dirName;
                    return [4 /*yield*/, repository_1.repoIpc.add({
                            workspaceId: workspaceId,
                            owner: owner,
                            name: name_1,
                            fullName: "".concat(owner, "/").concat(name_1),
                            isPrivate: false,
                            defaultBranch: "main",
                        })];
                case 4:
                    newRepo = _d.sent();
                    setLocalPath.mutate({ repoId: newRepo.id, localPath: selected });
                    return [3 /*break*/, 6];
                case 5:
                    err_1 = _d.sent();
                    setError(err_1 instanceof Error ? err_1.message : String(err_1));
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    }); }, [repos, unlinkedRepo, workspaceId, setLocalPath]);
    var handleSearch = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var results, _a, err_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!isAuthenticated || !searchQuery.trim())
                        return [2 /*return*/];
                    setSearching(true);
                    setError(null);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, 7, 8]);
                    if (!(searchQuery.trim().length <= 2)) return [3 /*break*/, 3];
                    return [4 /*yield*/, repository_1.repoIpc.listUserRepos()];
                case 2:
                    _a = _b.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, repository_1.repoIpc.searchGithub(searchQuery.trim())];
                case 4:
                    _a = _b.sent();
                    _b.label = 5;
                case 5:
                    results = _a;
                    setSearchResults(results);
                    return [3 /*break*/, 8];
                case 6:
                    err_2 = _b.sent();
                    setError(err_2 instanceof Error ? err_2.message : String(err_2));
                    return [3 /*break*/, 8];
                case 7:
                    setSearching(false);
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    }); }, [isAuthenticated, searchQuery]);
    var handleCloneRepo = (0, react_1.useCallback)(function (result) { return __awaiter(_this, void 0, void 0, function () {
        var dest, clonePath, url, repoRecord, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!isAuthenticated)
                        return [2 /*return*/];
                    setError(null);
                    return [4 /*yield*/, (0, plugin_dialog_1.open)({
                            directory: true,
                            title: "Choose where to clone ".concat(result.fullName),
                        })];
                case 1:
                    dest = _a.sent();
                    if (!dest)
                        return [2 /*return*/];
                    clonePath = "".concat(dest, "/").concat(result.name);
                    url = "https://github.com/".concat(result.fullName, ".git");
                    setCloning(true);
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 6, 7, 8]);
                    repoRecord = repos.find(function (r) { return r.owner === result.owner && r.name === result.name; });
                    if (!!repoRecord) return [3 /*break*/, 4];
                    return [4 /*yield*/, repository_1.repoIpc.add({
                            workspaceId: workspaceId,
                            owner: result.owner,
                            name: result.name,
                            fullName: result.fullName,
                            githubId: result.githubId,
                            isPrivate: result.isPrivate,
                            defaultBranch: result.defaultBranch,
                        })];
                case 3:
                    repoRecord = _a.sent();
                    _a.label = 4;
                case 4: return [4 /*yield*/, cloneRepo.mutateAsync({
                        url: url,
                        localPath: clonePath,
                        repoId: repoRecord.id,
                    })];
                case 5:
                    _a.sent();
                    setCloneOpen(false);
                    setSearchQuery("");
                    setSearchResults([]);
                    queryClient.invalidateQueries({ queryKey: ["repositories"] });
                    return [3 /*break*/, 8];
                case 6:
                    err_3 = _a.sent();
                    setError(err_3 instanceof Error ? err_3.message : String(err_3));
                    return [3 /*break*/, 8];
                case 7:
                    setCloning(false);
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    }); }, [isAuthenticated, repos, workspaceId, cloneRepo, queryClient]);
    return (<div className="flex flex-col gap-1 px-5 pb-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground/70">
          No repository linked
        </span>

        <div className="flex items-center gap-2">
          <button onClick={handleSelectLocal} disabled={disabled || setLocalPath.isPending} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50">
            {setLocalPath.isPending ? (<lucide_react_1.Loader2 className="h-3 w-3 animate-spin"/>) : (<lucide_react_1.FolderOpen className="h-3 w-3"/>)}
            Select local
          </button>

          {isAuthenticated && (<dialog_1.Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
              <dialog_1.DialogTrigger asChild>
                <button disabled={disabled || cloning} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50">
                  {cloning ? (<lucide_react_1.Loader2 className="h-3 w-3 animate-spin"/>) : (<lucide_react_1.Download className="h-3 w-3"/>)}
                  Clone from GitHub
                </button>
              </dialog_1.DialogTrigger>
              <dialog_1.DialogContent className="max-w-sm">
                <dialog_1.DialogHeader>
                  <dialog_1.DialogTitle>Clone from GitHub</dialog_1.DialogTitle>
                </dialog_1.DialogHeader>
                <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <lucide_react_1.Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground"/>
                  <input type="text" value={searchQuery} onChange={function (e) { return setSearchQuery(e.target.value); }} onKeyDown={function (e) {
                if (e.key === "Enter")
                    handleSearch();
            }} placeholder="Search repositories..." className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/50 focus:outline-none" autoFocus/>
                  {searching && (<lucide_react_1.Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground"/>)}
                </div>
                <div className="max-h-52 overflow-y-auto rounded-md border">
                  {searchResults.length === 0 ? (<div className="px-3 py-6 text-center text-xs text-muted-foreground">
                      {searchQuery
                    ? "Press Enter to search"
                    : "Type to search your repos"}
                    </div>) : (searchResults.map(function (result) { return (<button key={result.githubId} onClick={function () { return handleCloneRepo(result); }} disabled={cloning} className={(0, utils_1.cn)("flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors border-b last:border-b-0", cloning && "opacity-50")}>
                        <span className="flex-1 truncate">
                          {result.fullName}
                        </span>
                        {result.isPrivate && (<lucide_react_1.Lock className="h-3 w-3 shrink-0 text-muted-foreground"/>)}
                        {result.description && (<span className="hidden"/>)}
                      </button>); }))}
                </div>
                {error && (<p className="text-xs text-destructive">{error}</p>)}
              </dialog_1.DialogContent>
            </dialog_1.Dialog>)}
        </div>
      </div>

      {error && !cloneOpen && (<p className="text-[11px] text-destructive truncate">{error}</p>)}
    </div>);
}
