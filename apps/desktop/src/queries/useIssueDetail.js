"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useIssueDetail = useIssueDetail;
var react_query_1 = require("@tanstack/react-query");
var github_1 = require("@/ipc/github");
var authStore_1 = require("@/stores/authStore");
function useIssueDetail(owner, repo, number) {
    var isAuthenticated = (0, authStore_1.useAuthStore)(function (s) { return s.isAuthenticated; });
    return (0, react_query_1.useQuery)({
        queryKey: ["issueDetail", owner, repo, number],
        queryFn: function () { return github_1.githubIpc.getIssueDetail(owner, repo, number); },
        enabled: isAuthenticated && !!owner && !!repo && number != null,
    });
}
