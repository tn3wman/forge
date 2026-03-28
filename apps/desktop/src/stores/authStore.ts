import { create } from "zustand";
import type { GitHubUser } from "@forge/shared";

interface AuthStore {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: GitHubUser | null;
  setAuthenticated: (user: GitHubUser) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  setAuthenticated: (user) =>
    set({ isAuthenticated: true, isLoading: false, user }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () =>
    set({ isAuthenticated: false, isLoading: false, user: null }),
}));
