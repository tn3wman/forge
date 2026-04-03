"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useLocalRepo = useLocalRepo;
var workspaceStore_1 = require("@/stores/workspaceStore");
function useLocalRepo() {
    return (0, workspaceStore_1.useWorkspaceStore)(function (s) { return s.selectedRepoLocalPath; });
}
