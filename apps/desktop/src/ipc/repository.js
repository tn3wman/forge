"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repoIpc = void 0;
var core_1 = require("@tauri-apps/api/core");
exports.repoIpc = {
    add: function (request) {
        return (0, core_1.invoke)("repo_add", { request: request });
    },
    list: function (workspaceId) {
        return (0, core_1.invoke)("repo_list", { workspaceId: workspaceId });
    },
    remove: function (id) { return (0, core_1.invoke)("repo_remove", { id: id }); },
    searchGithub: function (query) {
        return (0, core_1.invoke)("github_search_repos", { query: query });
    },
    listUserRepos: function () {
        return (0, core_1.invoke)("github_list_user_repos");
    },
};
