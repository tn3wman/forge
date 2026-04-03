import { useMutation, useQueryClient } from "@tanstack/react-query";
import { githubIpc } from "@/ipc/github";

export function useSubmitReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; number: number; event: string; body: string }) =>
      githubIpc.submitReview(args.owner, args.repo, args.number, args.event, args.body),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["prDetail", args.owner, args.repo, args.number] });
      queryClient.invalidateQueries({ queryKey: ["pullRequests"] });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; number: number; body: string }) =>
      githubIpc.addComment(args.owner, args.repo, args.number, args.body),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["prDetail", args.owner, args.repo, args.number] });
      queryClient.invalidateQueries({ queryKey: ["issueDetail", args.owner, args.repo, args.number] });
    },
  });
}

export function useEditComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; commentId: number; body: string }) =>
      githubIpc.editComment(args.owner, args.repo, args.commentId, args.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prDetail"] });
      queryClient.invalidateQueries({ queryKey: ["issueDetail"] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; commentId: number }) =>
      githubIpc.deleteComment(args.owner, args.repo, args.commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prDetail"] });
      queryClient.invalidateQueries({ queryKey: ["issueDetail"] });
    },
  });
}

export function useMergePr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; number: number; method: string; title?: string; message?: string }) =>
      githubIpc.mergePr(args.owner, args.repo, args.number, args.method, args.title, args.message),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["prDetail", args.owner, args.repo, args.number] });
      queryClient.invalidateQueries({ queryKey: ["pullRequests"] });
    },
  });
}

export function useClosePr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; number: number }) =>
      githubIpc.closePr(args.owner, args.repo, args.number),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["prDetail", args.owner, args.repo, args.number] });
      queryClient.invalidateQueries({ queryKey: ["pullRequests"] });
    },
  });
}

export function useReopenPr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; number: number }) =>
      githubIpc.reopenPr(args.owner, args.repo, args.number),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["prDetail", args.owner, args.repo, args.number] });
      queryClient.invalidateQueries({ queryKey: ["pullRequests"] });
    },
  });
}

export function useMarkPrReady() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; number: number }) =>
      githubIpc.markPrReady(args.owner, args.repo, args.number),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["prDetail", args.owner, args.repo, args.number] });
      queryClient.invalidateQueries({ queryKey: ["pullRequests"] });
    },
  });
}

export function useConvertPrToDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; number: number }) =>
      githubIpc.convertPrToDraft(args.owner, args.repo, args.number),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["prDetail", args.owner, args.repo, args.number] });
      queryClient.invalidateQueries({ queryKey: ["pullRequests"] });
    },
  });
}

export function useCreatePr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; title: string; body: string; head: string; base: string; draft: boolean }) =>
      githubIpc.createPr(args.owner, args.repo, args.title, args.body, args.head, args.base, args.draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pullRequests"] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}

export function useCloseIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; number: number }) =>
      githubIpc.closeIssue(args.owner, args.repo, args.number),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["issueDetail", args.owner, args.repo, args.number] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}

export function useReopenIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; number: number }) =>
      githubIpc.reopenIssue(args.owner, args.repo, args.number),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["issueDetail", args.owner, args.repo, args.number] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}

export function useUpdateIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; number: number; title?: string; body?: string }) =>
      githubIpc.updateIssue(args.owner, args.repo, args.number, args.title, args.body),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["issueDetail", args.owner, args.repo, args.number] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}

export function useLockIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; number: number; lockReason?: string }) =>
      githubIpc.lockIssue(args.owner, args.repo, args.number, args.lockReason),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["issueDetail", args.owner, args.repo, args.number] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}

export function useUnlockIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; number: number }) =>
      githubIpc.unlockIssue(args.owner, args.repo, args.number),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["issueDetail", args.owner, args.repo, args.number] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}

export function useSetIssueLabels() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; number: number; labels: string[] }) =>
      githubIpc.setIssueLabels(args.owner, args.repo, args.number, args.labels),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["issueDetail", args.owner, args.repo, args.number] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}

export function useSetIssueAssignees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; number: number; assignees: string[] }) =>
      githubIpc.setIssueAssignees(args.owner, args.repo, args.number, args.assignees),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["issueDetail", args.owner, args.repo, args.number] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}

export function useCreateIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; title: string; body: string; labels: string[]; assignees: string[] }) =>
      githubIpc.createIssue(args.owner, args.repo, args.title, args.body, args.labels, args.assignees),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}
