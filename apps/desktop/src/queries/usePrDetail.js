"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePrDetail = usePrDetail;
exports.usePrCommits = usePrCommits;
exports.usePrFiles = usePrFiles;
var react_query_1 = require("@tanstack/react-query");
var github_1 = require("@/ipc/github");
var authStore_1 = require("@/stores/authStore");
function usePrDetail(owner, repo, number) {
    var isAuthenticated = (0, authStore_1.useAuthStore)(function (s) { return s.isAuthenticated; });
    return (0, react_query_1.useQuery)({
        queryKey: ["prDetail", owner, repo, number],
        queryFn: function () { return github_1.githubIpc.getPrDetail(owner, repo, number); },
        enabled: isAuthenticated && !!owner && !!repo && number != null,
        refetchInterval: 60000,
    });
}
function usePrCommits(owner, repo, number) {
    var isAuthenticated = (0, authStore_1.useAuthStore)(function (s) { return s.isAuthenticated; });
    return (0, react_query_1.useQuery)({
        queryKey: ["prCommits", owner, repo, number],
        queryFn: function () { return github_1.githubIpc.getPrCommits(owner, repo, number); },
        enabled: isAuthenticated && !!owner && !!repo && number != null,
    });
}
function usePrFiles(owner, repo, number) {
    var isAuthenticated = (0, authStore_1.useAuthStore)(function (s) { return s.isAuthenticated; });
    return (0, react_query_1.useQuery)({
        queryKey: ["prFiles", owner, repo, number],
        queryFn: function () { return github_1.githubIpc.getPrFiles(owner, repo, number); },
        enabled: isAuthenticated && !!owner && !!repo && number != null,
    });
}
