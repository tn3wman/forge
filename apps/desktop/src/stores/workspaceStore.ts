import { create } from "zustand";

export type AppPage = "dashboard" | "pull-requests" | "issues" | "notifications" | "pr-detail" | "issue-detail";

interface WorkspaceStore {
  activeWorkspaceId: string | null;
  activePage: AppPage;
  selectedPrNumber: number | null;
  selectedIssueNumber: number | null;
  selectedRepoFullName: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  setActivePage: (page: AppPage) => void;
  navigateToPr: (repoFullName: string, number: number) => void;
  navigateToIssue: (repoFullName: string, number: number) => void;
  goBack: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  activeWorkspaceId: null,
  activePage: "dashboard",
  selectedPrNumber: null,
  selectedIssueNumber: null,
  selectedRepoFullName: null,
  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
  setActivePage: (page) => set({ activePage: page }),
  navigateToPr: (repoFullName, number) =>
    set({ selectedRepoFullName: repoFullName, selectedPrNumber: number, activePage: "pr-detail" }),
  navigateToIssue: (repoFullName, number) =>
    set({ selectedRepoFullName: repoFullName, selectedIssueNumber: number, activePage: "issue-detail" }),
  goBack: () => {
    const { activePage } = get();
    if (activePage === "pr-detail") {
      set({ selectedPrNumber: null, selectedRepoFullName: null, activePage: "pull-requests" });
    } else if (activePage === "issue-detail") {
      set({ selectedIssueNumber: null, selectedRepoFullName: null, activePage: "issues" });
    }
  },
}));
