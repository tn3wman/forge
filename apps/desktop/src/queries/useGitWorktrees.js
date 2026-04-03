"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGitWorktrees = useGitWorktrees;
var react_query_1 = require("@tanstack/react-query");
var git_1 = require("../ipc/git");
function useGitWorktrees(localPath) {
    return (0, react_query_1.useQuery)({
        queryKey: ["git-worktrees", localPath],
        queryFn: function () { return git_1.gitIpc.listWorktrees(localPath); },
        enabled: !!localPath,
    });
}
