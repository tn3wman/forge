import { useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { authIpc } from "@/ipc/auth";

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    // Only check on initial mount when not yet authenticated
    if (!store.isAuthenticated && store.isLoading) {
      checkAuth();
    }
  }, []);

  async function checkAuth() {
    console.log("[Forge] checkAuth: checking keychain...");
    try {
      const token = await authIpc.getStoredToken();
      console.log("[Forge] checkAuth: token found:", !!token);
      if (token) {
        try {
          const user = await authIpc.getUser();
          console.log("[Forge] checkAuth: user fetched:", user.login);
          store.setAuthenticated(user);
        } catch (apiErr) {
          // Token is stale or revoked — clear it and show login screen.
          console.warn("[Forge] checkAuth: stored token rejected, clearing:", apiErr);
          await authIpc.deleteStoredToken();
          store.setLoading(false);
        }
      } else {
        store.setLoading(false);
      }
    } catch (e) {
      console.error("[Forge] checkAuth error:", e);
      store.setLoading(false);
    }
  }

  const handleLogout = useCallback(async () => {
    await authIpc.deleteStoredToken();
    store.logout();
  }, [store.logout]);

  return {
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    user: store.user,
    logout: handleLogout,
    checkAuth,
  };
}
