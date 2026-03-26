import { invoke } from "@tauri-apps/api/core";
import type { DeviceFlowResponse, TokenInfo, GitHubUser } from "@forge/shared";

export const authIpc = {
  startDeviceFlow: () => invoke<DeviceFlowResponse>("auth_start_device_flow"),

  pollDeviceFlow: (deviceCode: string) =>
    invoke<TokenInfo | null>("auth_poll_device_flow", { deviceCode }),

  getStoredToken: () => invoke<string | null>("auth_get_stored_token"),

  deleteStoredToken: () => invoke<void>("auth_delete_stored_token"),

  getUser: (token: string) => invoke<GitHubUser>("auth_get_user", { token }),
};
