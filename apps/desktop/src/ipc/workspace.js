"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspaceIpc = void 0;
var core_1 = require("@tauri-apps/api/core");
exports.workspaceIpc = {
    create: function (request) {
        return (0, core_1.invoke)("workspace_create", { request: request });
    },
    list: function () { return (0, core_1.invoke)("workspace_list"); },
    get: function (id) { return (0, core_1.invoke)("workspace_get", { id: id }); },
    update: function (id, request) {
        return (0, core_1.invoke)("workspace_update", { id: id, request: request });
    },
    delete: function (id) { return (0, core_1.invoke)("workspace_delete", { id: id }); },
    reorder: function (ids) { return (0, core_1.invoke)("workspace_reorder", { ids: ids }); },
};
