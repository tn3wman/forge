import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useWorkspaces } from "@/queries/useWorkspaces";
import { getWorkspaceColor } from "@/lib/workspaceColors";

export function useWorkspaceTint(): React.CSSProperties | undefined {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { data: workspaces } = useWorkspaces();
  const activeWorkspace = workspaces?.find((ws) => ws.id === activeWorkspaceId);
  const hex = activeWorkspace ? getWorkspaceColor(activeWorkspace.color).bg : null;
  return hex
    ? { backgroundColor: `color-mix(in srgb, ${hex} 6%, transparent)` }
    : undefined;
}
