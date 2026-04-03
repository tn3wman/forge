"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGitStatus = useGitStatus;
var react_query_1 = require("@tanstack/react-query");
var git_1 = require("../ipc/git");
function useGitStatus(localPath) {
    return (0, react_query_1.useQuery)({
        queryKey: ["git-status", localPath],
        queryFn: function () { return git_1.gitIpc.getStatus(localPath); },
        enabled: !!localPath,
        refetchInterval: 5000,
    });
}
