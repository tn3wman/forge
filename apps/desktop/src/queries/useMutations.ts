import { useMutation, useQueryClient } from "@tanstack/react-query";
import { githubIpc } from "@/ipc/github";
import { useAuthStore } from "@/stores/authStore";

export function useSubmitReview() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; number: number; event: string; body: string }) =>
      githubIpc.submitReview(token!, args.owner, args.repo, args.number, args.event, args.body),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["prDetail", args.owner, args.repo, args.number] });
      queryClient.invalidateQueries({ queryKey: ["pullRequests"] });
    },
  });
}

export function useAddComment() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; number: number; body: string }) =>
      githubIpc.addComment(token!, args.owner, args.repo, args.number, args.body),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["prDetail", args.owner, args.repo, args.number] });
      queryClient.invalidateQueries({ queryKey: ["issueDetail", args.owner, args.repo, args.number] });
    },
  });
}

export function useEditComment() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; commentId: number; body: string }) =>
      githubIpc.editComment(token!, args.owner, args.repo, args.commentId, args.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prDetail"] });
      queryClient.invalidateQueries({ queryKey: ["issueDetail"] });
    },
  });
}

export function useDeleteComment() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; commentId: number }) =>
      githubIpc.deleteComment(token!, args.owner, args.repo, args.commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prDetail"] });
      queryClient.invalidateQueries({ queryKey: ["issueDetail"] });
    },
  });
}

export function useMergePr() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; number: number; method: string; title?: string; message?: string }) =>
      githubIpc.mergePr(token!, args.owner, args.repo, args.number, args.method, args.title, args.message),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["prDetail", args.owner, args.repo, args.number] });
      queryClient.invalidateQueries({ queryKey: ["pullRequests"] });
    },
  });
}

export function useClosePr() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; number: number }) =>
      githubIpc.closePr(token!, args.owner, args.repo, args.number),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["prDetail", args.owner, args.repo, args.number] });
      queryClient.invalidateQueries({ queryKey: ["pullRequests"] });
    },
  });
}

export function useReopenPr() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; number: number }) =>
      githubIpc.reopenPr(token!, args.owner, args.repo, args.number),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["prDetail", args.owner, args.repo, args.number] });
      queryClient.invalidateQueries({ queryKey: ["pullRequests"] });
    },
  });
}

export function useCreatePr() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { owner: string; repo: string; title: string; body: string; head: string; base: string; draft: boolean }) =>
      githubIpc.createPr(token!, args.owner, args.repo, args.title, args.body, args.head, args.base, args.draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pullRequests"] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}
