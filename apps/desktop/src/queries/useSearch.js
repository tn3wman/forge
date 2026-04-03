"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSearch = useSearch;
var react_query_1 = require("@tanstack/react-query");
var core_1 = require("@tauri-apps/api/core");
var authStore_1 = require("@/stores/authStore");
var useRepositories_1 = require("./useRepositories");
var workspaceStore_1 = require("@/stores/workspaceStore");
function useSearch(query) {
    var _a;
    var isAuthenticated = (0, authStore_1.useAuthStore)(function (s) { return s.isAuthenticated; });
    var activeWorkspaceId = (0, workspaceStore_1.useWorkspaceStore)().activeWorkspaceId;
    var repos = (0, useRepositories_1.useRepositories)(activeWorkspaceId).data;
    var repoTuples = (_a = repos === null || repos === void 0 ? void 0 : repos.map(function (r) { return [r.owner, r.name]; })) !== null && _a !== void 0 ? _a : [];
    return (0, react_query_1.useQuery)({
        queryKey: ["search", query, repoTuples.map(function (r) { return r.join("/"); })],
        queryFn: function () {
            return (0, core_1.invoke)("github_search", {
                query: query,
                repos: repoTuples,
            });
        },
        enabled: isAuthenticated && query.length >= 2,
        staleTime: 30000,
    });
}
