"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCliDiscovery = useCliDiscovery;
exports.useSlashCommands = useSlashCommands;
var react_query_1 = require("@tanstack/react-query");
var terminal_1 = require("@/ipc/terminal");
var agent_1 = require("@/ipc/agent");
function useCliDiscovery() {
    return (0, react_query_1.useQuery)({
        queryKey: ["cli-discovery"],
        queryFn: function () { return terminal_1.terminalIpc.discoverClis(); },
        staleTime: 5 * 60 * 1000,
    });
}
function useSlashCommands(cliName) {
    return (0, react_query_1.useQuery)({
        queryKey: ["slash-commands", cliName],
        queryFn: function () { return agent_1.agentIpc.discoverSlashCommands(cliName); },
        enabled: !!cliName,
        staleTime: 10 * 60 * 1000,
    });
}
