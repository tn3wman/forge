"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useNotifications = useNotifications;
exports.useUnreadCount = useUnreadCount;
exports.useMarkNotificationRead = useMarkNotificationRead;
exports.useMarkAllRead = useMarkAllRead;
var react_query_1 = require("@tanstack/react-query");
var notifications_1 = require("@/ipc/notifications");
var authStore_1 = require("@/stores/authStore");
function useNotifications(showAll) {
    if (showAll === void 0) { showAll = false; }
    var isAuthenticated = (0, authStore_1.useAuthStore)(function (s) { return s.isAuthenticated; });
    return (0, react_query_1.useQuery)({
        queryKey: ["notifications", showAll],
        queryFn: function () { return notifications_1.notificationsIpc.list(showAll); },
        enabled: isAuthenticated,
        refetchInterval: 60000,
    });
}
function useUnreadCount(repoFullNames) {
    var data = useNotifications(false).data;
    if (!data)
        return 0;
    if (!repoFullNames || repoFullNames.length === 0)
        return data.filter(function (n) { return n.unread; }).length;
    var lowerNames = new Set(repoFullNames.map(function (n) { return n.toLowerCase(); }));
    return data.filter(function (n) { return n.unread && lowerNames.has(n.repoFullName.toLowerCase()); }).length;
}
function useMarkNotificationRead() {
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function (threadId) { return notifications_1.notificationsIpc.markRead(threadId); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
}
function useMarkAllRead() {
    var queryClient = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: function () { return notifications_1.notificationsIpc.markAllRead(); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
}
