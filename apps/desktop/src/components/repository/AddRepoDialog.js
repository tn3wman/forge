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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddRepoDialog = AddRepoDialog;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var dialog_1 = require("@/components/ui/dialog");
var input_1 = require("@/components/ui/input");
var button_1 = require("@/components/ui/button");
var repository_1 = require("@/ipc/repository");
var useRepositories_1 = require("@/queries/useRepositories");
var workspaceStore_1 = require("@/stores/workspaceStore");
var authStore_1 = require("@/stores/authStore");
function AddRepoDialog(_a) {
    var _this = this;
    var _b;
    var open = _a.open, onOpenChange = _a.onOpenChange, onClose = _a.onClose;
    var _c = (0, react_1.useState)(""), query = _c[0], setQuery = _c[1];
    var _d = (0, react_1.useState)([]), results = _d[0], setResults = _d[1];
    var _e = (0, react_1.useState)(false), isSearching = _e[0], setIsSearching = _e[1];
    var _f = (0, react_1.useState)(null), addingId = _f[0], setAddingId = _f[1];
    var addRepo = (0, useRepositories_1.useAddRepo)();
    var activeWorkspaceId = (0, workspaceStore_1.useWorkspaceStore)().activeWorkspaceId;
    var isAuthenticated = (0, authStore_1.useAuthStore)(function (s) { return s.isAuthenticated; });
    var existingRepos = (0, useRepositories_1.useRepositories)(activeWorkspaceId).data;
    var _g = (0, react_1.useState)(new Set()), addedIds = _g[0], setAddedIds = _g[1];
    var _h = (0, react_1.useState)([]), addedRepoIds = _h[0], setAddedRepoIds = _h[1];
    // Load user repos on open
    (0, react_1.useEffect)(function () {
        if (open && isAuthenticated) {
            setIsSearching(true);
            repository_1.repoIpc
                .listUserRepos()
                .then(setResults)
                .catch(console.error)
                .finally(function () { return setIsSearching(false); });
        }
        if (!open) {
            setQuery("");
            setResults([]);
            setAddedIds(new Set());
            setAddedRepoIds([]);
        }
    }, [open, isAuthenticated]);
    // Search on query change (debounced)
    (0, react_1.useEffect)(function () {
        if (!query.trim() || !isAuthenticated)
            return;
        var timeout = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
            var res, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        setIsSearching(true);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, repository_1.repoIpc.searchGithub(query)];
                    case 2:
                        res = _a.sent();
                        setResults(res);
                        return [3 /*break*/, 5];
                    case 3:
                        e_1 = _a.sent();
                        console.error("Search failed:", e_1);
                        return [3 /*break*/, 5];
                    case 4:
                        setIsSearching(false);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        }); }, 300);
        return function () { return clearTimeout(timeout); };
    }, [query, isAuthenticated]);
    var existingGithubIds = new Set((_b = existingRepos === null || existingRepos === void 0 ? void 0 : existingRepos.map(function (r) { return r.githubId; })) !== null && _b !== void 0 ? _b : []);
    function handleAdd(repo) {
        return __awaiter(this, void 0, void 0, function () {
            var newRepo_1, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!activeWorkspaceId)
                            return [2 /*return*/];
                        setAddingId(repo.githubId);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, addRepo.mutateAsync({
                                workspaceId: activeWorkspaceId,
                                owner: repo.owner,
                                name: repo.name,
                                fullName: repo.fullName,
                                githubId: repo.githubId,
                                isPrivate: repo.isPrivate,
                                defaultBranch: repo.defaultBranch,
                            })];
                    case 2:
                        newRepo_1 = _a.sent();
                        setAddedIds(function (prev) { return new Set(prev).add(repo.githubId); });
                        setAddedRepoIds(function (prev) { return __spreadArray(__spreadArray([], prev, true), [newRepo_1.id], false); });
                        return [3 /*break*/, 5];
                    case 3:
                        e_2 = _a.sent();
                        console.error("Failed to add repo:", e_2);
                        return [3 /*break*/, 5];
                    case 4:
                        setAddingId(null);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
    function handleOpenChange(nextOpen) {
        onOpenChange(nextOpen);
    }
    return (<dialog_1.Dialog open={open} onOpenChange={handleOpenChange}>
      <dialog_1.DialogContent className="sm:max-w-[500px]">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle>Add Repository</dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            Search your GitHub repositories to add to this workspace.
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>

        <div className="relative">
          <lucide_react_1.Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
          <input_1.Input placeholder="Search repositories..." value={query} onChange={function (e) { return setQuery(e.target.value); }} className="pl-9" autoFocus/>
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {isSearching ? (<div className="flex items-center justify-center py-8">
              <lucide_react_1.Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
            </div>) : results.length === 0 ? (<div className="py-8 text-center text-sm text-muted-foreground">
              {query ? "No repositories found" : "Loading your repositories..."}
            </div>) : (<div className="space-y-0.5">
              {results.map(function (repo) { return (<div key={repo.githubId} className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">
                        {repo.fullName}
                      </span>
                      {repo.isPrivate && (<lucide_react_1.Lock className="h-3 w-3 shrink-0 text-muted-foreground"/>)}
                    </div>
                    {repo.description && (<p className="truncate text-xs text-muted-foreground">
                        {repo.description}
                      </p>)}
                  </div>
                  {repo.stars > 0 && (<div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <lucide_react_1.Star className="h-3 w-3"/>
                      {repo.stars}
                    </div>)}
                  {existingGithubIds.has(repo.githubId) || addedIds.has(repo.githubId) ? (<span className="flex h-7 items-center gap-1 text-xs text-muted-foreground">
                      <lucide_react_1.Check className="h-3.5 w-3.5"/>
                      Added
                    </span>) : (<button_1.Button size="sm" variant="outline" onClick={function () { return handleAdd(repo); }} disabled={addingId === repo.githubId} className="h-7 text-xs">
                      {addingId === repo.githubId ? "Adding..." : "Add"}
                    </button_1.Button>)}
                </div>); })}
            </div>)}
        </div>

        {addedRepoIds.length > 0 && (<div className="flex items-center justify-between border-t pt-3">
            <span className="text-xs text-muted-foreground">
              {addedRepoIds.length} {addedRepoIds.length === 1 ? "repo" : "repos"} added
            </span>
            <div className="flex items-center gap-2">
              <button_1.Button variant="ghost" size="sm" onClick={function () { return handleOpenChange(false); }} className="text-xs">
                Done
              </button_1.Button>
              <button_1.Button size="sm" onClick={function () {
                onClose === null || onClose === void 0 ? void 0 : onClose(addedRepoIds);
                onOpenChange(false);
            }} className="gap-1 text-xs">
                Set up repos
                <lucide_react_1.ArrowRight className="h-3 w-3"/>
              </button_1.Button>
            </div>
          </div>)}
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
