import { invoke } from "@tauri-apps/api/core";
import type { PullRequest, Issue, PrDetail, PrCommit, PrFile, IssueDetail } from "@forge/shared";

export interface RepoRef {
  owner: string;
  repo: string;
}

export interface DashboardStats {
  totalOpenPrs: number;
  totalOpenIssues: number;
  prsNeedingReview: number;
  recentlyMerged: number;
}

export const githubIpc = {
  listPrs: (token: string, owner: string, repo: string, state?: string) =>
    invoke<PullRequest[]>("github_list_prs", { token, owner, repo, state: state ?? null }),

  listIssues: (token: string, owner: string, repo: string, state?: string) =>
    invoke<Issue[]>("github_list_issues", { token, owner, repo, state: state ?? null }),

  getDashboard: (token: string, repos: RepoRef[]) =>
    invoke<DashboardStats>("github_get_dashboard", { token, repos }),

  getPrDetail: (token: string, owner: string, repo: string, number: number) =>
    invoke<PrDetail>("github_get_pr_detail", { token, owner, repo, number }),

  getPrCommits: (token: string, owner: string, repo: string, number: number) =>
    invoke<PrCommit[]>("github_get_pr_commits", { token, owner, repo, number }),

  getPrFiles: (token: string, owner: string, repo: string, number: number) =>
    invoke<PrFile[]>("github_get_pr_files", { token, owner, repo, number }),

  getIssueDetail: (token: string, owner: string, repo: string, number: number) =>
    invoke<IssueDetail>("github_get_issue_detail", { token, owner, repo, number }),

  submitReview: (token: string, owner: string, repo: string, number: number, event: string, body: string) =>
    invoke<void>("github_submit_review", { token, owner, repo, number, event, body }),

  addComment: (token: string, owner: string, repo: string, number: number, body: string) =>
    invoke<{ id: number; body: string }>("github_add_comment", { token, owner, repo, number, body }),

  editComment: (token: string, owner: string, repo: string, commentId: number, body: string) =>
    invoke<void>("github_edit_comment", { token, owner, repo, commentId, body }),

  deleteComment: (token: string, owner: string, repo: string, commentId: number) =>
    invoke<void>("github_delete_comment", { token, owner, repo, commentId }),

  mergePr: (token: string, owner: string, repo: string, number: number, method: string, title?: string, message?: string) =>
    invoke<void>("github_merge_pr", { token, owner, repo, number, method, title: title ?? null, message: message ?? null }),

  closePr: (token: string, owner: string, repo: string, number: number) =>
    invoke<void>("github_close_pr", { token, owner, repo, number }),

  reopenPr: (token: string, owner: string, repo: string, number: number) =>
    invoke<void>("github_reopen_pr", { token, owner, repo, number }),
};
