"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTerminalStore = void 0;
var zustand_1 = require("zustand");
var tabCounter = 0;
function generateTabId() {
    return "tab-".concat(Date.now(), "-").concat(++tabCounter);
}
exports.useTerminalStore = (0, zustand_1.create)(function (set, get) { return ({
    layoutMode: "tabs",
    tabs: [],
    activeTabId: null,
    setLayoutMode: function (mode) { return set({ layoutMode: mode }); },
    addTab: function (tab) {
        return set(function (s) { return ({
            tabs: __spreadArray(__spreadArray([], s.tabs, true), [tab], false),
            activeTabId: tab.tabId,
        }); });
    },
    addPreSessionTab: function (workspaceId, config) {
        var tabId = generateTabId();
        set(function (s) {
            var _a;
            return ({
                tabs: __spreadArray(__spreadArray([], s.tabs, true), [
                    {
                        tabId: tabId,
                        sessionId: null,
                        workspaceId: workspaceId,
                        label: (_a = config === null || config === void 0 ? void 0 : config.label) !== null && _a !== void 0 ? _a : "New Agent",
                        cliName: null,
                        mode: "Normal",
                        type: "chat",
                        status: "pre-session",
                        workingDirectory: config === null || config === void 0 ? void 0 : config.workingDirectory,
                    },
                ], false),
                activeTabId: tabId,
            });
        });
        return tabId;
    },
    activateTab: function (tabId, sessionId, updates) {
        return set(function (s) { return ({
            tabs: s.tabs.map(function (t) {
                return t.tabId === tabId
                    ? __assign(__assign(__assign({}, t), updates), { sessionId: sessionId, status: "active" }) : t;
            }),
        }); });
    },
    updateTabConfig: function (tabId, updates) {
        return set(function (s) { return ({
            tabs: s.tabs.map(function (t) {
                return t.tabId === tabId ? __assign(__assign({}, t), updates) : t;
            }),
        }); });
    },
    removeTab: function (tabId) {
        return set(function (s) {
            var _a, _b;
            var tabs = s.tabs.filter(function (t) { return t.tabId !== tabId; });
            var activeTabId = s.activeTabId === tabId
                ? (_b = (_a = tabs[tabs.length - 1]) === null || _a === void 0 ? void 0 : _a.tabId) !== null && _b !== void 0 ? _b : null
                : s.activeTabId;
            return { tabs: tabs, activeTabId: activeTabId };
        });
    },
    setActiveTab: function (tabId) { return set({ activeTabId: tabId }); },
}); });
