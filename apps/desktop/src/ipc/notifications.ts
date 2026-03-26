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
  list: (token: string, all: boolean) =>
    invoke<NotificationItem[]>("github_list_notifications", { token, all }),
  markRead: (token: string, threadId: string) =>
    invoke<void>("github_mark_notification_read", { token, threadId }),
  markAllRead: (token: string) =>
    invoke<void>("github_mark_all_notifications_read", { token }),
};
