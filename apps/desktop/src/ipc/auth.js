"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authIpc = void 0;
var core_1 = require("@tauri-apps/api/core");
exports.authIpc = {
    startDeviceFlow: function () { return (0, core_1.invoke)("auth_start_device_flow"); },
    pollDeviceFlow: function (deviceCode) {
        return (0, core_1.invoke)("auth_poll_device_flow", { deviceCode: deviceCode });
    },
    getStoredToken: function () { return (0, core_1.invoke)("auth_get_stored_token"); },
    deleteStoredToken: function () { return (0, core_1.invoke)("auth_delete_stored_token"); },
    getUser: function () { return (0, core_1.invoke)("auth_get_user"); },
};
