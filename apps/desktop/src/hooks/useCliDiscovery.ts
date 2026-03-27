import { useQuery } from "@tanstack/react-query";
import { terminalIpc } from "@/ipc/terminal";
import { agentIpc } from "@/ipc/agent";

export function useCliDiscovery() {
  return useQuery({
    queryKey: ["cli-discovery"],
    queryFn: () => terminalIpc.discoverClis(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSlashCommands(cliName: string | null) {
  return useQuery({
    queryKey: ["slash-commands", cliName],
    queryFn: () => agentIpc.discoverSlashCommands(cliName!),
    enabled: !!cliName,
    staleTime: 10 * 60 * 1000,
  });
}
