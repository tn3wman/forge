"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuthStore = void 0;
var zustand_1 = require("zustand");
exports.useAuthStore = (0, zustand_1.create)(function (set) { return ({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    setAuthenticated: function (user) {
        return set({ isAuthenticated: true, isLoading: false, user: user });
    },
    setLoading: function (isLoading) { return set({ isLoading: isLoading }); },
    logout: function () {
        return set({ isAuthenticated: false, isLoading: false, user: null });
    },
}); });
