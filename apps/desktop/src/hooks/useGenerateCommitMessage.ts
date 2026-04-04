import { useMutation } from "@tanstack/react-query";
import { gitIpc } from "../ipc/git";
import { useSettingsStore } from "../stores/settingsStore";

export function useGenerateCommitMessage() {
  const claudePath = useSettingsStore((s) => s.claudeExecutablePath);
  const provider = useSettingsStore((s) => s.commitMessageProvider);
  const model = useSettingsStore((s) => s.commitMessageModel);
  return useMutation({
    mutationFn: async (path: string) =>
      gitIpc.generateCommitMessage(path, claudePath || undefined, provider || undefined, model || undefined),
  });
}
