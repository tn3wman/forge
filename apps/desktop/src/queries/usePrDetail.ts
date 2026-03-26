import { useQuery } from "@tanstack/react-query";
import { githubIpc } from "@/ipc/github";
import { useAuthStore } from "@/stores/authStore";
import type { PrDetail, PrCommit, PrFile } from "@forge/shared";

export function usePrDetail(owner: string | null, repo: string | null, number: number | null) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["prDetail", owner, repo, number],
    queryFn: () => githubIpc.getPrDetail(token!, owner!, repo!, number!),
    enabled: !!token && !!owner && !!repo && number != null,
    refetchInterval: 60_000,
  });
}

export function usePrCommits(owner: string | null, repo: string | null, number: number | null) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["prCommits", owner, repo, number],
    queryFn: () => githubIpc.getPrCommits(token!, owner!, repo!, number!),
    enabled: !!token && !!owner && !!repo && number != null,
  });
}

export function usePrFiles(owner: string | null, repo: string | null, number: number | null) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["prFiles", owner, repo, number],
    queryFn: () => githubIpc.getPrFiles(token!, owner!, repo!, number!),
    enabled: !!token && !!owner && !!repo && number != null,
  });
}
