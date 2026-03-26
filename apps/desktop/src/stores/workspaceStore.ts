import { create } from "zustand";

export type AppPage = "dashboard" | "pull-requests" | "issues" | "notifications" | "pr-detail" | "issue-detail" | "commit-graph" | "changes" | "branches" | "search" | "settings";

interface NavState {
  activePage: AppPage;
  selectedPrNumber: number | null;
  selectedIssueNumber: number | null;
  selectedRepoFullName: string | null;
  selectedRepoLocalPath: string | null;
}

interface WorkspaceStore extends NavState {
  activeWorkspaceId: string | null;
  navHistory: NavState[];
  setActiveWorkspaceId: (id: string | null) => void;
  setActivePage: (page: AppPage) => void;
  navigateToPr: (repoFullName: string, number: number) => void;
  navigateToIssue: (repoFullName: string, number: number) => void;
  navigateToChanges: (localPath: string) => void;
  navigateToCommitGraph: (localPath: string) => void;
  navigateToBranches: (localPath: string) => void;
  goBack: () => void;
}

function currentNavState(state: WorkspaceStore): NavState {
  return {
    activePage: state.activePage,
    selectedPrNumber: state.selectedPrNumber,
    selectedIssueNumber: state.selectedIssueNumber,
    selectedRepoFullName: state.selectedRepoFullName,
    selectedRepoLocalPath: state.selectedRepoLocalPath,
  };
}

// Pages that are "detail" views — navigating to these pushes history
const DETAIL_PAGES: AppPage[] = ["pr-detail", "issue-detail"];

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  activeWorkspaceId: null,
  activePage: "dashboard",
  selectedPrNumber: null,
  selectedIssueNumber: null,
  selectedRepoFullName: null,
  selectedRepoLocalPath: null,
  navHistory: [],
  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
  setActivePage: (page) => set({ activePage: page, navHistory: [] }),
  navigateToPr: (repoFullName, number) => {
    const state = get();
    const history = [...state.navHistory, currentNavState(state)];
    set({ selectedRepoFullName: repoFullName, selectedPrNumber: number, activePage: "pr-detail", navHistory: history });
  },
  navigateToIssue: (repoFullName, number) => {
    const state = get();
    const history = [...state.navHistory, currentNavState(state)];
    set({ selectedRepoFullName: repoFullName, selectedIssueNumber: number, activePage: "issue-detail", navHistory: history });
  },
  navigateToChanges: (localPath) =>
    set({ selectedRepoLocalPath: localPath, activePage: "changes", navHistory: [] }),
  navigateToCommitGraph: (localPath) =>
    set({ selectedRepoLocalPath: localPath, activePage: "commit-graph", navHistory: [] }),
  navigateToBranches: (localPath) =>
    set({ selectedRepoLocalPath: localPath, activePage: "branches", navHistory: [] }),
  goBack: () => {
    const { navHistory } = get();
    if (navHistory.length > 0) {
      const previous = navHistory[navHistory.length - 1];
      set({ ...previous, navHistory: navHistory.slice(0, -1) });
    } else {
      // Fallback: no history, go to a sensible default
      const { activePage } = get();
      if (activePage === "pr-detail") {
        set({ selectedPrNumber: null, selectedRepoFullName: null, activePage: "pull-requests", navHistory: [] });
      } else if (activePage === "issue-detail") {
        set({ selectedIssueNumber: null, selectedRepoFullName: null, activePage: "issues", navHistory: [] });
      } else if (activePage === "changes" || activePage === "commit-graph" || activePage === "branches") {
        set({ selectedRepoLocalPath: null, activePage: "dashboard", navHistory: [] });
      }
    }
  },
}));
