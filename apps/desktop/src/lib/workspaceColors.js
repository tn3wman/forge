"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKSPACE_COLORS = void 0;
exports.getWorkspaceColor = getWorkspaceColor;
exports.WORKSPACE_COLORS = [
    { id: "blue", label: "Blue", bg: "#2563eb", text: "#ffffff" },
    { id: "green", label: "Green", bg: "#16a34a", text: "#ffffff" },
    { id: "purple", label: "Purple", bg: "#9333ea", text: "#ffffff" },
    { id: "orange", label: "Orange", bg: "#ea580c", text: "#ffffff" },
    { id: "pink", label: "Pink", bg: "#db2777", text: "#ffffff" },
    { id: "teal", label: "Teal", bg: "#0d9488", text: "#ffffff" },
    { id: "red", label: "Red", bg: "#dc2626", text: "#ffffff" },
    { id: "yellow", label: "Yellow", bg: "#ca8a04", text: "#ffffff" },
    { id: "indigo", label: "Indigo", bg: "#4f46e5", text: "#ffffff" },
    { id: "emerald", label: "Emerald", bg: "#059669", text: "#ffffff" },
];
function getWorkspaceColor(id) {
    var _a;
    return (_a = exports.WORKSPACE_COLORS.find(function (c) { return c.id === id; })) !== null && _a !== void 0 ? _a : exports.WORKSPACE_COLORS[0];
}
