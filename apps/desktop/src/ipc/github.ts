import { invoke } from "@tauri-apps/api/core";
import type { PullRequest, Issue, PrDetail, PrCommit, PrFile, IssueDetail, RepoLabel, IssuesPage } from "@forge/shared";

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
  listPrs: (owner: string, repo: string, state?: string) =>
    invoke<PullRequest[]>("github_list_prs", { owner, repo, state: state ?? null }),

  listIssues: (owner: string, repo: string, state?: string, after?: string | null) =>
    invoke<IssuesPage>("github_list_issues", { owner, repo, state: state ?? null, after: after ?? null }),

  getDashboard: (repos: RepoRef[]) =>
    invoke<DashboardStats>("github_get_dashboard", { repos }),

  getPrDetail: (owner: string, repo: string, number: number) =>
    invoke<PrDetail>("github_get_pr_detail", { owner, repo, number }),

  getPrCommits: (owner: string, repo: string, number: number) =>
    invoke<PrCommit[]>("github_get_pr_commits", { owner, repo, number }),

  getPrFiles: (owner: string, repo: string, number: number) =>
    invoke<PrFile[]>("github_get_pr_files", { owner, repo, number }),

  getIssueDetail: (owner: string, repo: string, number: number) =>
    invoke<IssueDetail>("github_get_issue_detail", { owner, repo, number }),

  submitReview: (owner: string, repo: string, number: number, event: string, body: string) =>
    invoke<void>("github_submit_review", { owner, repo, number, event, body }),

  addComment: (owner: string, repo: string, number: number, body: string) =>
    invoke<{ id: number; body: string }>("github_add_comment", { owner, repo, number, body }),

  editComment: (owner: string, repo: string, commentId: number, body: string) =>
    invoke<void>("github_edit_comment", { owner, repo, commentId, body }),

  deleteComment: (owner: string, repo: string, commentId: number) =>
    invoke<void>("github_delete_comment", { owner, repo, commentId }),

  mergePr: (owner: string, repo: string, number: number, method: string, title?: string, message?: string) =>
    invoke<void>("github_merge_pr", { owner, repo, number, method, title: title ?? null, message: message ?? null }),

  closePr: (owner: string, repo: string, number: number) =>
    invoke<void>("github_close_pr", { owner, repo, number }),

  reopenPr: (owner: string, repo: string, number: number) =>
    invoke<void>("github_reopen_pr", { owner, repo, number }),

  createPr: (owner: string, repo: string, title: string, body: string, head: string, base: string, draft: boolean) =>
    invoke<{ number: number; htmlUrl: string }>("github_create_pr", { owner, repo, title, body, head, base, draft }),

  markPrReady: (owner: string, repo: string, number: number) =>
    invoke<void>("github_mark_pr_ready", { owner, repo, number }),

  convertPrToDraft: (owner: string, repo: string, number: number) =>
    invoke<void>("github_convert_pr_to_draft", { owner, repo, number }),

  closeIssue: (owner: string, repo: string, number: number) =>
    invoke<void>("github_close_issue", { owner, repo, number }),

  reopenIssue: (owner: string, repo: string, number: number) =>
    invoke<void>("github_reopen_issue", { owner, repo, number }),

  updateIssue: (owner: string, repo: string, number: number, title?: string, body?: string) =>
    invoke<void>("github_update_issue", { owner, repo, number, title: title ?? null, body: body ?? null }),

  lockIssue: (owner: string, repo: string, number: number, lockReason?: string) =>
    invoke<void>("github_lock_issue", { owner, repo, number, lockReason: lockReason ?? null }),

  unlockIssue: (owner: string, repo: string, number: number) =>
    invoke<void>("github_unlock_issue", { owner, repo, number }),

  setIssueLabels: (owner: string, repo: string, number: number, labels: string[]) =>
    invoke<void>("github_set_issue_labels", { owner, repo, number, labels }),

  setIssueAssignees: (owner: string, repo: string, number: number, assignees: string[]) =>
    invoke<void>("github_set_issue_assignees", { owner, repo, number, assignees }),

  createIssue: (owner: string, repo: string, title: string, body: string, labels: string[], assignees: string[]) =>
    invoke<{ number: number; htmlUrl: string }>("github_create_issue", { owner, repo, title, body, labels, assignees }),

  listRepoLabels: (owner: string, repo: string) =>
    invoke<RepoLabel[]>("github_list_repo_labels", { owner, repo }),

  listRepoAssignees: (owner: string, repo: string) =>
    invoke<string[]>("github_list_repo_assignees", { owner, repo }),

  createRepo: (
    name: string,
    isPrivate: boolean,
    autoInit: boolean,
    description?: string,
    gitignoreTemplate?: string,
    licenseTemplate?: string,
  ) =>
    invoke<{
      githubId: number;
      fullName: string;
      name: string;
      owner: string;
      isPrivate: boolean;
      defaultBranch: string;
      cloneUrl: string;
      htmlUrl: string;
    }>("github_create_repo", {
      name,
      description: description ?? null,
      private: isPrivate,
      autoInit,
      gitignoreTemplate: gitignoreTemplate ?? null,
      licenseTemplate: licenseTemplate ?? null,
    }),
};
