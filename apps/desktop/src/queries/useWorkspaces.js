"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWorkspaces = useWorkspaces;
exports.useWorkspace = useWorkspace;
exports.useCreateWorkspace = useCreateWorkspace;
exports.useUpdateWorkspace = useUpdateWorkspace;
exports.useDeleteWorkspace = useDeleteWorkspace;
var react_query_1 = require("@tanstack/react-query");
var workspace_1 = require("@/ipc/workspace");
function useWorkspaces() {
    return (0, react_query_1.useQuery)({
        queryKey: ["workspaces"],
        queryFn: function () { return workspace_1.workspaceIpc.list(); },
    });
}
function useWorkspace(id) {
    return (0, react_query_1.useQuery)({
        queryKey: ["workspace", id],
        queryFn: function () { return workspace_1.workspaceIpc.get(id); },
        enabled: !!id,
    });
}
function useCreateWorkspace() {
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (request) { return workspace_1.workspaceIpc.create(request); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["workspaces"] });
        },
    });
}
function useUpdateWorkspace() {
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (_a) {
            var id = _a.id, request = _a.request;
            return workspace_1.workspaceIpc.update(id, request);
        },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["workspaces"] });
        },
    });
}
function useDeleteWorkspace() {
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (id) { return workspace_1.workspaceIpc.delete(id); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["workspaces"] });
        },
    });
}
