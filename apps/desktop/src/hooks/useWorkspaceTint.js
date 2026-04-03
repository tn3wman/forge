"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWorkspaceTint = useWorkspaceTint;
var workspaceStore_1 = require("@/stores/workspaceStore");
var useWorkspaces_1 = require("@/queries/useWorkspaces");
var workspaceColors_1 = require("@/lib/workspaceColors");
function useWorkspaceTint() {
    var activeWorkspaceId = (0, workspaceStore_1.useWorkspaceStore)(function (s) { return s.activeWorkspaceId; });
    var workspaces = (0, useWorkspaces_1.useWorkspaces)().data;
    var activeWorkspace = workspaces === null || workspaces === void 0 ? void 0 : workspaces.find(function (ws) { return ws.id === activeWorkspaceId; });
    var hex = activeWorkspace ? (0, workspaceColors_1.getWorkspaceColor)(activeWorkspace.color).bg : null;
    return hex
        ? { backgroundColor: "color-mix(in srgb, ".concat(hex, " 6%, transparent)") }
        : undefined;
}
