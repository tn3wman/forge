"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSubmitReview = useSubmitReview;
exports.useAddComment = useAddComment;
exports.useEditComment = useEditComment;
exports.useDeleteComment = useDeleteComment;
exports.useMergePr = useMergePr;
exports.useClosePr = useClosePr;
exports.useReopenPr = useReopenPr;
exports.useCreatePr = useCreatePr;
var react_query_1 = require("@tanstack/react-query");
var github_1 = require("@/ipc/github");
function useSubmitReview() {
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (args) {
            return github_1.githubIpc.submitReview(args.owner, args.repo, args.number, args.event, args.body);
        },
        onSuccess: function (_data, args) {
            queryClient.invalidateQueries({ queryKey: ["prDetail", args.owner, args.repo, args.number] });
            queryClient.invalidateQueries({ queryKey: ["pullRequests"] });
        },
    });
}
function useAddComment() {
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (args) {
            return github_1.githubIpc.addComment(args.owner, args.repo, args.number, args.body);
        },
        onSuccess: function (_data, args) {
            queryClient.invalidateQueries({ queryKey: ["prDetail", args.owner, args.repo, args.number] });
            queryClient.invalidateQueries({ queryKey: ["issueDetail", args.owner, args.repo, args.number] });
        },
    });
}
function useEditComment() {
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (args) {
            return github_1.githubIpc.editComment(args.owner, args.repo, args.commentId, args.body);
        },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["prDetail"] });
            queryClient.invalidateQueries({ queryKey: ["issueDetail"] });
        },
    });
}
function useDeleteComment() {
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (args) {
            return github_1.githubIpc.deleteComment(args.owner, args.repo, args.commentId);
        },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["prDetail"] });
            queryClient.invalidateQueries({ queryKey: ["issueDetail"] });
        },
    });
}
function useMergePr() {
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (args) {
            return github_1.githubIpc.mergePr(args.owner, args.repo, args.number, args.method, args.title, args.message);
        },
        onSuccess: function (_data, args) {
            queryClient.invalidateQueries({ queryKey: ["prDetail", args.owner, args.repo, args.number] });
            queryClient.invalidateQueries({ queryKey: ["pullRequests"] });
        },
    });
}
function useClosePr() {
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (args) {
            return github_1.githubIpc.closePr(args.owner, args.repo, args.number);
        },
        onSuccess: function (_data, args) {
            queryClient.invalidateQueries({ queryKey: ["prDetail", args.owner, args.repo, args.number] });
            queryClient.invalidateQueries({ queryKey: ["pullRequests"] });
        },
    });
}
function useReopenPr() {
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (args) {
            return github_1.githubIpc.reopenPr(args.owner, args.repo, args.number);
        },
        onSuccess: function (_data, args) {
            queryClient.invalidateQueries({ queryKey: ["prDetail", args.owner, args.repo, args.number] });
            queryClient.invalidateQueries({ queryKey: ["pullRequests"] });
        },
    });
}
function useCreatePr() {
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (args) {
            return github_1.githubIpc.createPr(args.owner, args.repo, args.title, args.body, args.head, args.base, args.draft);
        },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["pullRequests"] });
            queryClient.invalidateQueries({ queryKey: ["issues"] });
        },
    });
}
