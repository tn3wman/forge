import { useWorkspaceStore } from "@/stores/workspaceStore";

export function useLocalRepo() {
  return useWorkspaceStore((s) => s.selectedRepoLocalPath);
}
