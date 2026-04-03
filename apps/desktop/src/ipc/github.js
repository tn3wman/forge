"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubIpc = void 0;
var core_1 = require("@tauri-apps/api/core");
exports.githubIpc = {
    listPrs: function (owner, repo, state) {
        return (0, core_1.invoke)("github_list_prs", { owner: owner, repo: repo, state: state !== null && state !== void 0 ? state : null });
    },
    listIssues: function (owner, repo, state) {
        return (0, core_1.invoke)("github_list_issues", { owner: owner, repo: repo, state: state !== null && state !== void 0 ? state : null });
    },
    getDashboard: function (repos) {
        return (0, core_1.invoke)("github_get_dashboard", { repos: repos });
    },
    getPrDetail: function (owner, repo, number) {
        return (0, core_1.invoke)("github_get_pr_detail", { owner: owner, repo: repo, number: number });
    },
    getPrCommits: function (owner, repo, number) {
        return (0, core_1.invoke)("github_get_pr_commits", { owner: owner, repo: repo, number: number });
    },
    getPrFiles: function (owner, repo, number) {
        return (0, core_1.invoke)("github_get_pr_files", { owner: owner, repo: repo, number: number });
    },
    getIssueDetail: function (owner, repo, number) {
        return (0, core_1.invoke)("github_get_issue_detail", { owner: owner, repo: repo, number: number });
    },
    submitReview: function (owner, repo, number, event, body) {
        return (0, core_1.invoke)("github_submit_review", { owner: owner, repo: repo, number: number, event: event, body: body });
    },
    addComment: function (owner, repo, number, body) {
        return (0, core_1.invoke)("github_add_comment", { owner: owner, repo: repo, number: number, body: body });
    },
    editComment: function (owner, repo, commentId, body) {
        return (0, core_1.invoke)("github_edit_comment", { owner: owner, repo: repo, commentId: commentId, body: body });
    },
    deleteComment: function (owner, repo, commentId) {
        return (0, core_1.invoke)("github_delete_comment", { owner: owner, repo: repo, commentId: commentId });
    },
    mergePr: function (owner, repo, number, method, title, message) {
        return (0, core_1.invoke)("github_merge_pr", { owner: owner, repo: repo, number: number, method: method, title: title !== null && title !== void 0 ? title : null, message: message !== null && message !== void 0 ? message : null });
    },
    closePr: function (owner, repo, number) {
        return (0, core_1.invoke)("github_close_pr", { owner: owner, repo: repo, number: number });
    },
    reopenPr: function (owner, repo, number) {
        return (0, core_1.invoke)("github_reopen_pr", { owner: owner, repo: repo, number: number });
    },
    createPr: function (owner, repo, title, body, head, base, draft) {
        return (0, core_1.invoke)("github_create_pr", { owner: owner, repo: repo, title: title, body: body, head: head, base: base, draft: draft });
    },
};
