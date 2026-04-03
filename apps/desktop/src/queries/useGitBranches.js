"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGitBranches = useGitBranches;
exports.useCurrentBranch = useCurrentBranch;
var react_query_1 = require("@tanstack/react-query");
var git_1 = require("../ipc/git");
function useGitBranches(localPath) {
    return (0, react_query_1.useQuery)({
        queryKey: ["git-branches", localPath],
        queryFn: function () { return git_1.gitIpc.listBranches(localPath); },
        enabled: !!localPath,
    });
}
function useCurrentBranch(localPath) {
    return (0, react_query_1.useQuery)({
        queryKey: ["git-current-branch", localPath],
        queryFn: function () { return git_1.gitIpc.getCurrentBranch(localPath); },
        enabled: !!localPath,
    });
}
