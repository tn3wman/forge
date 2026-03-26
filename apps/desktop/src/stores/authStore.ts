import { create } from "zustand";
import type { GitHubUser } from "@forge/shared";

interface AuthStore {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: GitHubUser | null;
  token: string | null;
  setAuthenticated: (token: string, user: GitHubUser) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,
  setAuthenticated: (token, user) =>
    set({ isAuthenticated: true, isLoading: false, token, user }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () =>
    set({ isAuthenticated: false, isLoading: false, token: null, user: null }),
}));
