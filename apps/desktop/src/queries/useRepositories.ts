import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { repoIpc, type AddRepoRequest } from "@/ipc/repository";

export function useRepositories(workspaceId: string | null) {
  return useQuery({
    queryKey: ["repositories", workspaceId],
    queryFn: () => repoIpc.list(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useAddRepo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: AddRepoRequest) => repoIpc.add(request),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["repositories", variables.workspaceId] });
    },
  });
}

export function useRemoveRepo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repoIpc.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
    },
  });
}
