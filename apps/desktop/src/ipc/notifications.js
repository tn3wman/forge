"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsIpc = void 0;
var core_1 = require("@tauri-apps/api/core");
exports.notificationsIpc = {
    list: function (all) {
        return (0, core_1.invoke)("github_list_notifications", { all: all });
    },
    markRead: function (threadId) {
        return (0, core_1.invoke)("github_mark_notification_read", { threadId: threadId });
    },
    markAllRead: function () {
        return (0, core_1.invoke)("github_mark_all_notifications_read");
    },
};
