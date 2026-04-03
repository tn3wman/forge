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
exports.useStageFiles = useStageFiles;
exports.useUnstageFiles = useUnstageFiles;
exports.useStageAll = useStageAll;
exports.useCommit = useCommit;
exports.useAmend = useAmend;
exports.useGitFetch = useGitFetch;
exports.useGitPull = useGitPull;
exports.useGitPush = useGitPush;
exports.useCreateBranch = useCreateBranch;
exports.useCheckoutBranch = useCheckoutBranch;
exports.useDeleteBranch = useDeleteBranch;
exports.useDeleteRemoteBranch = useDeleteRemoteBranch;
exports.useRenameBranch = useRenameBranch;
exports.useStashPush = useStashPush;
exports.useStashPop = useStashPop;
exports.useStashApply = useStashApply;
exports.useStashDrop = useStashDrop;
exports.useCloneRepo = useCloneRepo;
exports.useSetLocalPath = useSetLocalPath;
var react_query_1 = require("@tanstack/react-query");
var git_1 = require("../ipc/git");
function useStageFiles() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var path = _b.path, paths = _b.paths;
            return __generator(this, function (_c) {
                return [2 /*return*/, git_1.gitIpc.stageFiles(path, paths)];
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["git-status"] });
            queryClient.invalidateQueries({ queryKey: ["git-diff"] });
        },
    });
}
function useUnstageFiles() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var path = _b.path, paths = _b.paths;
            return __generator(this, function (_c) {
                return [2 /*return*/, git_1.gitIpc.unstageFiles(path, paths)];
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["git-status"] });
            queryClient.invalidateQueries({ queryKey: ["git-diff"] });
        },
    });
}
function useStageAll() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var path = _b.path;
            return __generator(this, function (_c) {
                return [2 /*return*/, git_1.gitIpc.stageAll(path)];
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["git-status"] });
            queryClient.invalidateQueries({ queryKey: ["git-diff"] });
        },
    });
}
function useCommit() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var path = _b.path, message = _b.message;
            return __generator(this, function (_c) {
                return [2 /*return*/, git_1.gitIpc.commit(path, message)];
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["git-status"] });
            queryClient.invalidateQueries({ queryKey: ["git-log"] });
            queryClient.invalidateQueries({ queryKey: ["git-diff"] });
            queryClient.invalidateQueries({ queryKey: ["git-branches"] });
        },
    });
}
function useAmend() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var path = _b.path, message = _b.message;
            return __generator(this, function (_c) {
                return [2 /*return*/, git_1.gitIpc.amend(path, message)];
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["git-status"] });
            queryClient.invalidateQueries({ queryKey: ["git-log"] });
            queryClient.invalidateQueries({ queryKey: ["git-diff"] });
        },
    });
}
function useGitFetch() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var path = _b.path, remote = _b.remote;
            return __generator(this, function (_c) {
                return [2 /*return*/, git_1.gitIpc.fetch(path, remote)];
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["git-branches"] });
            queryClient.invalidateQueries({ queryKey: ["git-log"] });
        },
    });
}
function useGitPull() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var path = _b.path, remote = _b.remote, branch = _b.branch;
            return __generator(this, function (_c) {
                return [2 /*return*/, git_1.gitIpc.pull(path, remote, branch)];
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["git-branches"] });
            queryClient.invalidateQueries({ queryKey: ["git-log"] });
            queryClient.invalidateQueries({ queryKey: ["git-status"] });
        },
    });
}
function useGitPush() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var path = _b.path, remote = _b.remote, branch = _b.branch;
            return __generator(this, function (_c) {
                return [2 /*return*/, git_1.gitIpc.push(path, remote, branch)];
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["git-branches"] });
        },
    });
}
function useCreateBranch() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var path = _b.path, name = _b.name, fromRef = _b.fromRef;
            return __generator(this, function (_c) {
                return [2 /*return*/, git_1.gitIpc.createBranch(path, name, fromRef)];
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["git-branches"] });
        },
    });
}
function useCheckoutBranch() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var path = _b.path, name = _b.name;
            return __generator(this, function (_c) {
                return [2 /*return*/, git_1.gitIpc.checkoutBranch(path, name)];
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["git-branches"] });
            queryClient.invalidateQueries({ queryKey: ["git-current-branch"] });
            queryClient.invalidateQueries({ queryKey: ["git-status"] });
            queryClient.invalidateQueries({ queryKey: ["git-log"] });
        },
    });
}
function useDeleteBranch() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var path = _b.path, name = _b.name, force = _b.force;
            return __generator(this, function (_c) {
                return [2 /*return*/, git_1.gitIpc.deleteBranch(path, name, force)];
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["git-branches"] });
            queryClient.invalidateQueries({ queryKey: ["git-worktrees"] });
        },
    });
}
function useDeleteRemoteBranch() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var path = _b.path, remote = _b.remote, branch = _b.branch;
            return __generator(this, function (_c) {
                return [2 /*return*/, git_1.gitIpc.deleteRemoteBranch(path, remote, branch)];
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["git-branches"] });
        },
    });
}
function useRenameBranch() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var path = _b.path, oldName = _b.oldName, newName = _b.newName;
            return __generator(this, function (_c) {
                return [2 /*return*/, git_1.gitIpc.renameBranch(path, oldName, newName)];
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["git-branches"] });
        },
    });
}
function useStashPush() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var path = _b.path, message = _b.message, includeUntracked = _b.includeUntracked;
            return __generator(this, function (_c) {
                return [2 /*return*/, git_1.gitIpc.stashPush(path, message, includeUntracked)];
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["git-status"] });
            queryClient.invalidateQueries({ queryKey: ["git-diff"] });
        },
    });
}
function useStashPop() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var path = _b.path, index = _b.index;
            return __generator(this, function (_c) {
                return [2 /*return*/, git_1.gitIpc.stashPop(path, index)];
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["git-status"] });
            queryClient.invalidateQueries({ queryKey: ["git-diff"] });
        },
    });
}
function useStashApply() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var path = _b.path, index = _b.index;
            return __generator(this, function (_c) {
                return [2 /*return*/, git_1.gitIpc.stashApply(path, index)];
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["git-status"] });
            queryClient.invalidateQueries({ queryKey: ["git-diff"] });
        },
    });
}
function useStashDrop() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var path = _b.path, index = _b.index;
            return __generator(this, function (_c) {
                return [2 /*return*/, git_1.gitIpc.stashDrop(path, index)];
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["git-stash"] });
        },
    });
}
function useCloneRepo() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var url = _b.url, localPath = _b.localPath, repoId = _b.repoId;
            return __generator(this, function (_c) {
                return [2 /*return*/, git_1.gitIpc.cloneRepo(url, localPath, repoId)];
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["repositories"] });
        },
    });
}
function useSetLocalPath() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var repoId = _b.repoId, localPath = _b.localPath;
            return __generator(this, function (_c) {
                return [2 /*return*/, git_1.gitIpc.setLocalPath(repoId, localPath)];
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["repositories"] });
        },
    });
}
