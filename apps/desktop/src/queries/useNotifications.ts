import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsIpc } from "@/ipc/notifications";
import { useAuthStore } from "@/stores/authStore";

export function useNotifications(showAll = false) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ["notifications", showAll],
    queryFn: () => notificationsIpc.list(showAll),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });
}

export function useUnreadCount(repoFullNames?: string[]) {
  const { data } = useNotifications(false);
  if (!data) return 0;
  if (!repoFullNames || repoFullNames.length === 0) return data.filter((n) => n.unread).length;
  const lowerNames = new Set(repoFullNames.map((n) => n.toLowerCase()));
  return data.filter((n) => n.unread && lowerNames.has(n.repoFullName.toLowerCase())).length;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => notificationsIpc.markRead(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsIpc.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
