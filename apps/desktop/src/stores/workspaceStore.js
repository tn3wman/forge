"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWorkspaceStore = void 0;
var zustand_1 = require("zustand");
function currentNavState(state) {
    return {
        activePage: state.activePage,
        selectedPrNumber: state.selectedPrNumber,
        selectedIssueNumber: state.selectedIssueNumber,
        selectedRepoFullName: state.selectedRepoFullName,
        selectedRepoLocalPath: state.selectedRepoLocalPath,
    };
}
// Pages that are "detail" views — navigating to these pushes history
var DETAIL_PAGES = ["pr-detail", "issue-detail"];
exports.useWorkspaceStore = (0, zustand_1.create)(function (set, get) { return ({
    activeWorkspaceId: null,
    activePage: "home",
    selectedPrNumber: null,
    selectedIssueNumber: null,
    selectedRepoFullName: null,
    selectedRepoLocalPath: null,
    navHistory: [],
    setActiveWorkspaceId: function (id) { return set({ activeWorkspaceId: id, activePage: "home", navHistory: [] }); },
    setActivePage: function (page) { return set({ activePage: page, navHistory: [] }); },
    navigateToPr: function (repoFullName, number) {
        var state = get();
        var history = __spreadArray(__spreadArray([], state.navHistory, true), [currentNavState(state)], false);
        set({ selectedRepoFullName: repoFullName, selectedPrNumber: number, activePage: "pr-detail", navHistory: history });
    },
    navigateToIssue: function (repoFullName, number) {
        var state = get();
        var history = __spreadArray(__spreadArray([], state.navHistory, true), [currentNavState(state)], false);
        set({ selectedRepoFullName: repoFullName, selectedIssueNumber: number, activePage: "issue-detail", navHistory: history });
    },
    navigateToChanges: function (localPath) {
        return set({ selectedRepoLocalPath: localPath, activePage: "changes", navHistory: [] });
    },
    navigateToCommitGraph: function (localPath) {
        return set({ selectedRepoLocalPath: localPath, activePage: "commit-graph", navHistory: [] });
    },
    navigateToBranches: function (localPath) {
        return set({ selectedRepoLocalPath: localPath, activePage: "branches", navHistory: [] });
    },
    goBack: function () {
        var navHistory = get().navHistory;
        if (navHistory.length > 0) {
            var previous = navHistory[navHistory.length - 1];
            set(__assign(__assign({}, previous), { navHistory: navHistory.slice(0, -1) }));
        }
        else {
            // Fallback: no history, go to a sensible default
            var activePage = get().activePage;
            if (activePage === "pr-detail") {
                set({ selectedPrNumber: null, selectedRepoFullName: null, activePage: "pull-requests", navHistory: [] });
            }
            else if (activePage === "issue-detail") {
                set({ selectedIssueNumber: null, selectedRepoFullName: null, activePage: "issues", navHistory: [] });
            }
            else if (activePage === "changes" || activePage === "commit-graph" || activePage === "branches") {
                set({ selectedRepoLocalPath: null, activePage: "home", navHistory: [] });
            }
        }
    },
}); });
