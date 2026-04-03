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
exports.RepoItem = RepoItem;
exports.RepoList = RepoList;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var plugin_dialog_1 = require("@tauri-apps/plugin-dialog");
var tooltip_1 = require("@/components/ui/tooltip");
var useRepositories_1 = require("@/queries/useRepositories");
var workspaceStore_1 = require("@/stores/workspaceStore");
var useGitMutations_1 = require("@/queries/useGitMutations");
var AddRepoDialog_1 = require("./AddRepoDialog");
var RepoSetupDialog_1 = require("./RepoSetupDialog");
function RepoItem(_a) {
    var repo = _a.repo;
    var removeRepo = (0, useRepositories_1.useRemoveRepo)();
    var setLocalPath = (0, useGitMutations_1.useSetLocalPath)();
    function handleSetLocalPath() {
        return __awaiter(this, void 0, void 0, function () {
            var selected;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, plugin_dialog_1.open)({ directory: true, title: "Select local clone of ".concat(repo.fullName) })];
                    case 1:
                        selected = _a.sent();
                        if (selected) {
                            setLocalPath.mutate({ repoId: repo.id, localPath: selected });
                        }
                        return [2 /*return*/];
                }
            });
        });
    }
    return (<div className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
      <lucide_react_1.GitBranch className="h-3.5 w-3.5 shrink-0 text-muted-foreground"/>
      <span className="flex-1 truncate">{repo.fullName}</span>
      {repo.localPath && (<span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" title="Local path set"/>)}
      {repo.isPrivate && (<lucide_react_1.Lock className="h-3 w-3 shrink-0 text-muted-foreground"/>)}
      {!repo.localPath && (<button onClick={handleSetLocalPath} className="hidden h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground group-hover:flex" aria-label={"Set local path for ".concat(repo.fullName)} title="Set local clone path">
          <lucide_react_1.FolderOpen className="h-3 w-3"/>
        </button>)}
      <button onClick={function () { return removeRepo.mutate(repo.id); }} className="hidden h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive group-hover:flex" aria-label={"Remove ".concat(repo.fullName)}>
        <lucide_react_1.Trash2 className="h-3 w-3"/>
      </button>
    </div>);
}
function RepoList() {
    var _a = (0, react_1.useState)(false), showAdd = _a[0], setShowAdd = _a[1];
    var _b = (0, react_1.useState)(false), showRepoSetup = _b[0], setShowRepoSetup = _b[1];
    var _c = (0, react_1.useState)([]), reposToSetup = _c[0], setReposToSetup = _c[1];
    var activeWorkspaceId = (0, workspaceStore_1.useWorkspaceStore)().activeWorkspaceId;
    var _d = (0, useRepositories_1.useRepositories)(activeWorkspaceId), repos = _d.data, isLoading = _d.isLoading;
    function handleAddRepoClose(addedRepoIds) {
        if (!repos || addedRepoIds.length === 0)
            return;
        var unlinked = repos.filter(function (r) { return addedRepoIds.includes(r.id) && !r.localPath; });
        if (unlinked.length > 0) {
            setReposToSetup(unlinked);
            setShowRepoSetup(true);
        }
    }
    if (!activeWorkspaceId) {
        return (<div className="px-3 py-4 text-center text-xs text-muted-foreground">
        Select a workspace to see repositories
      </div>);
    }
    return (<div className="flex flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          Repositories
        </span>
        <tooltip_1.Tooltip>
          <tooltip_1.TooltipTrigger asChild>
            <button onClick={function () { return setShowAdd(true); }} className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              <lucide_react_1.Plus className="h-3.5 w-3.5"/>
            </button>
          </tooltip_1.TooltipTrigger>
          <tooltip_1.TooltipContent>Add Repository</tooltip_1.TooltipContent>
        </tooltip_1.Tooltip>
      </div>

      <div className="px-1">
        {isLoading ? (<div className="px-2 py-4 text-center text-xs text-muted-foreground">
            Loading...
          </div>) : (repos === null || repos === void 0 ? void 0 : repos.length) === 0 ? (<button onClick={function () { return setShowAdd(true); }} className="w-full rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground hover:border-primary hover:text-primary">
            Add your first repository
          </button>) : (repos === null || repos === void 0 ? void 0 : repos.map(function (repo) { return <RepoItem key={repo.id} repo={repo}/>; }))}
      </div>

      <AddRepoDialog_1.AddRepoDialog open={showAdd} onOpenChange={setShowAdd} onClose={handleAddRepoClose}/>
      <RepoSetupDialog_1.RepoSetupDialog open={showRepoSetup} onOpenChange={setShowRepoSetup} repos={reposToSetup}/>
    </div>);
}
