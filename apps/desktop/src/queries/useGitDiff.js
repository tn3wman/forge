"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGitDiff = useGitDiff;
var react_query_1 = require("@tanstack/react-query");
var git_1 = require("../ipc/git");
function useGitDiff(localPath, staged, filePath) {
    return (0, react_query_1.useQuery)({
        queryKey: ["git-diff", localPath, staged, filePath],
        queryFn: function () { return git_1.gitIpc.getDiff(localPath, staged, filePath); },
        enabled: !!localPath,
    });
}
