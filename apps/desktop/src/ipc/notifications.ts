import { invoke } from "@tauri-apps/api/core";

export interface NotificationItem {
  id: string;
  unread: boolean;
  reason: string;
  subjectTitle: string;
  subjectUrl: string | null;
  subjectType: string;
  repoFullName: string;
  repoOwner: string;
  repoName: string;
  updatedAt: string;
  url: string;
}

export const notificationsIpc = {
  list: (all: boolean) =>
    invoke<NotificationItem[]>("github_list_notifications", { all }),
  markRead: (threadId: string) =>
    invoke<void>("github_mark_notification_read", { threadId }),
  markAllRead: () =>
    invoke<void>("github_mark_all_notifications_read"),
};
