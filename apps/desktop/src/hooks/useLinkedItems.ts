import { useMemo } from "react";
import { usePullRequests } from "@/queries/usePullRequests";

export interface LinkedPrSummary {
  prNumber: number;
  prTitle: string;
  prState: string;
  repoFullName: string;
  headRef: string;
}

export function useIssueLinkedPrs(): Map<string, LinkedPrSummary[]> {
  const { data: pullRequests = [] } = usePullRequests();

  return useMemo(() => {
    const map = new Map<string, LinkedPrSummary[]>();

    for (const pr of pullRequests) {
      if (!pr.linkedIssues || pr.linkedIssues.length === 0) continue;
      for (const issue of pr.linkedIssues) {
        const key = `${pr.repoFullName}#${issue.number}`;
        const existing = map.get(key) ?? [];
        existing.push({
          prNumber: pr.number,
          prTitle: pr.title,
          prState: pr.state,
          repoFullName: pr.repoFullName ?? "",
          headRef: pr.headRef,
        });
        map.set(key, existing);
      }
    }

    return map;
  }, [pullRequests]);
}
