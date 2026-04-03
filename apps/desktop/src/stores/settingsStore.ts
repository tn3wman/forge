import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import type { AgentChatMode, ClaudeEffort } from "@forge/shared";

export interface AppSettings {
  githubPollInterval: number;
  gitPollInterval: number;
  showNotificationBadge: boolean;
  autoFetchOnSwitch: boolean;
  claudeExecutablePath: string;
  defaultModel: string;
  defaultEffort: ClaudeEffort;
  defaultPermissionMode: AgentChatMode;
  defaultPlanMode: boolean;
}

const DEFAULTS: AppSettings = {
  githubPollInterval: 60_000,
  gitPollInterval: 5_000,
  showNotificationBadge: true,
  autoFetchOnSwitch: true,
  claudeExecutablePath: "",
  defaultModel: "",
  defaultEffort: "medium",
  defaultPermissionMode: "assisted",
  defaultPlanMode: false,
};

interface SettingsStore extends AppSettings {
  loaded: boolean;
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...DEFAULTS,
  loaded: false,
  loadSettings: async () => {
    try {
      const store = await load("settings.json", { autoSave: true, defaults: { ...DEFAULTS } });
      const saved: Partial<AppSettings> = {};
      for (const key of Object.keys(DEFAULTS) as (keyof AppSettings)[]) {
        const val = await store.get(key);
        if (val !== null && val !== undefined) {
          (saved as Record<string, unknown>)[key] = val;
        }
      }
      set({ ...DEFAULTS, ...saved, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  updateSetting: async (key, value) => {
    set({ [key]: value } as Partial<AppSettings>);
    try {
      const store = await load("settings.json", { autoSave: true, defaults: { ...DEFAULTS } });
      await store.set(key, value);
    } catch (e) {
      console.error("Failed to persist setting:", e);
    }
  },
}));
