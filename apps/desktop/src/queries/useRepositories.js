"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRepositories = useRepositories;
exports.useAddRepo = useAddRepo;
exports.useRemoveRepo = useRemoveRepo;
var react_query_1 = require("@tanstack/react-query");
var repository_1 = require("@/ipc/repository");
function useRepositories(workspaceId) {
    return (0, react_query_1.useQuery)({
        queryKey: ["repositories", workspaceId],
        queryFn: function () { return repository_1.repoIpc.list(workspaceId); },
        enabled: !!workspaceId,
    });
}
function useAddRepo() {
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (request) { return repository_1.repoIpc.add(request); },
        onSuccess: function (_data, variables) {
            queryClient.invalidateQueries({ queryKey: ["repositories", variables.workspaceId] });
        },
    });
}
function useRemoveRepo() {
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (id) { return repository_1.repoIpc.remove(id); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["repositories"] });
        },
    });
}
