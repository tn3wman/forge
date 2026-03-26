export interface PullRequest {
  id: string;
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  authorLogin: string;
  authorAvatarUrl: string;
  headRef: string;
  baseRef: string;
  body: string;
  draft: boolean;
  reviewDecision: string | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  repoFullName?: string;
}

export interface Issue {
  id: string;
  number: number;
  title: string;
  state: "open" | "closed";
  authorLogin: string;
  authorAvatarUrl: string;
  body: string;
  labels: string[];
  assignees: string[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  repoFullName?: string;
}

export interface Notification {
  id: string;
  repoFullName: string;
  subjectTitle: string;
  subjectType: string;
  reason: string;
  unread: boolean;
  updatedAt: string;
}

export interface PrCommit {
  sha: string;
  messageHeadline: string;
  messageBody: string;
  authorLogin: string;
  authorAvatarUrl: string;
  authoredDate: string;
  additions: number;
  deletions: number;
}

export interface PrFile {
  path: string;
  additions: number;
  deletions: number;
  patch: string;
  status: string;
  previousPath?: string;
}

export interface ReviewComment {
  id: string;
  body: string;
  authorLogin: string;
  authorAvatarUrl: string;
  path: string | null;
  line: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  authorLogin: string;
  authorAvatarUrl: string;
  state: string;
  body: string;
  submittedAt: string | null;
  comments: ReviewComment[];
}

export interface TimelineEvent {
  eventType: string;
  actorLogin: string | null;
  actorAvatarUrl: string | null;
  createdAt: string | null;
  id?: string | null;
  body?: string | null;
  label?: string | null;
}

export interface StatusCheck {
  name: string;
  status: string;
  description: string | null;
  url: string | null;
}

export interface PrDetail extends PullRequest {
  mergeable: string;
  totalCommits: number;
  reviews: Review[];
  statusChecks: StatusCheck[];
  timeline: TimelineEvent[];
}

export interface IssueDetail extends Issue {
  timeline: TimelineEvent[];
}
