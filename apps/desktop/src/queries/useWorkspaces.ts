import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceIpc, type CreateWorkspaceRequest, type UpdateWorkspaceRequest } from "@/ipc/workspace";

export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: () => workspaceIpc.list(),
  });
}

export function useWorkspace(id: string | null) {
  return useQuery({
    queryKey: ["workspace", id],
    queryFn: () => workspaceIpc.get(id!),
    enabled: !!id,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateWorkspaceRequest) => workspaceIpc.create(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateWorkspaceRequest }) =>
      workspaceIpc.update(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workspaceIpc.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}
