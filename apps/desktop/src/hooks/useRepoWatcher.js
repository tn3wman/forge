"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRepoWatcher = useRepoWatcher;
var react_1 = require("react");
var event_1 = require("@tauri-apps/api/event");
var react_query_1 = require("@tanstack/react-query");
var git_1 = require("@/ipc/git");
function useRepoWatcher(localPath) {
    var queryClient = (0, react_query_1.useQueryClient)();
    (0, react_1.useEffect)(function () {
        if (!localPath)
            return;
        git_1.gitIpc.startWatching(localPath).catch(function () {
            // Watcher may fail if path is invalid — silently ignore
        });
        var unlisten = (0, event_1.listen)("repo-changed", function (event) {
            if (event.payload.path === localPath) {
                queryClient.invalidateQueries({ queryKey: ["git-status", localPath] });
                queryClient.invalidateQueries({ queryKey: ["git-log", localPath] });
                queryClient.invalidateQueries({ queryKey: ["git-branches", localPath] });
                queryClient.invalidateQueries({ queryKey: ["git-current-branch", localPath] });
                queryClient.invalidateQueries({ queryKey: ["git-stash", localPath] });
            }
        });
        return function () {
            git_1.gitIpc.stopWatching(localPath).catch(function () { });
            unlisten.then(function (fn) { return fn(); });
        };
    }, [localPath, queryClient]);
}
