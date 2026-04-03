export interface LinkedIssueRef {
  number: number;
  title: string;
  state: string;
}

export interface LinkedPrRef {
  number: number;
  title: string;
  state: string;
  repoFullName: string;
  willCloseTarget: boolean;
  headRef: string | null;
}

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
  linkedIssues: LinkedIssueRef[];
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
  locked: boolean;
  activeLockReason: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  repoFullName?: string;
}

export interface RepoLabel {
  name: string;
  color: string;
  description: string | null;
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
  sourceNumber?: number | null;
  sourceTitle?: string | null;
  sourceType?: string | null;
  sourceRepo?: string | null;
  willCloseTarget?: boolean | null;
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
  linkedPullRequests: LinkedPrRef[];
  timeline: TimelineEvent[];
}

// --- Notifications ---

export interface NotificationSubject {
  title: string;
  url: string | null;
  type: "Issue" | "PullRequest" | "Release" | "Discussion" | "CheckSuite" | "Commit" | string;
}

export interface NotificationItem {
  id: string;
  unread: boolean;
  reason: string;
  subject: NotificationSubject;
  repository: {
    fullName: string;
    owner: string;
    name: string;
  };
  updatedAt: string;
  url: string;
}
