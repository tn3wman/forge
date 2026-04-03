"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGitLog = useGitLog;
var react_query_1 = require("@tanstack/react-query");
var git_1 = require("../ipc/git");
function useGitLog(localPath, branch) {
    return (0, react_query_1.useInfiniteQuery)({
        queryKey: ["git-log", localPath, branch],
        queryFn: function (_a) {
            var _b = _a.pageParam, pageParam = _b === void 0 ? 0 : _b;
            return git_1.gitIpc.getLog(localPath, pageParam, 200, branch);
        },
        initialPageParam: 0,
        getNextPageParam: function (lastPage, allPages) {
            return lastPage.length === 200 ? allPages.length * 200 : undefined;
        },
        enabled: !!localPath,
    });
}
