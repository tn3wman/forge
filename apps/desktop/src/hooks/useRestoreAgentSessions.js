"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRestoreAgentSessions = useRestoreAgentSessions;
var react_1 = require("react");
var agent_1 = require("@/ipc/agent");
var agentStore_1 = require("@/stores/agentStore");
var terminalStore_1 = require("@/stores/terminalStore");
var agentPersistence_1 = require("@/lib/agentPersistence");
function restoreSessionToStores(session) {
    var _a, _b, _c;
    var terminalStore = terminalStore_1.useTerminalStore.getState();
    var agentStore = agentStore_1.useAgentStore.getState();
    // Check if already restored (avoid duplicates)
    if (agentStore.tabs.some(function (t) { return t.sessionId === session.id; })) {
        return;
    }
    // Add to terminal store
    var tabId = "restored-".concat(session.id);
    terminalStore.addTab({
        tabId: tabId,
        sessionId: session.id,
        workspaceId: session.workspaceId,
        label: session.displayName,
        cliName: session.cliName,
        mode: "Normal",
        type: "chat",
        status: "active",
        workingDirectory: (_a = session.workingDirectory) !== null && _a !== void 0 ? _a : undefined,
    });
    // Add to agent store as completed (dead) session
    agentStore.addTab({
        sessionId: session.id,
        label: session.displayName,
        cliName: session.cliName,
        mode: (_b = session.mode) !== null && _b !== void 0 ? _b : "supervised",
        state: "completed",
        conversationId: (_c = session.conversationId) !== null && _c !== void 0 ? _c : null,
        provider: session.provider,
        model: session.model,
        permissionMode: session.permissionMode,
        agent: session.agent,
        effort: session.effort,
        claudePath: session.claudePath,
        planMode: session.planMode,
        totalCost: session.totalCost,
    });
}
function loadMessagesForSession(sessionId) {
    return __awaiter(this, void 0, void 0, function () {
        var agentStore, persisted, maxSeq, messages, store, _i, messages_1, msg, err_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    agentStore = agentStore_1.useAgentStore.getState();
                    // Skip if messages already loaded
                    if (((_b = (_a = agentStore.messagesBySession[sessionId]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) > 0) {
                        return [2 /*return*/];
                    }
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, agent_1.agentIpc.loadMessages(sessionId, 0, 5000)];
                case 2:
                    persisted = _c.sent();
                    if (persisted.length === 0)
                        return [2 /*return*/];
                    maxSeq = Math.max.apply(Math, persisted.map(function (m) { return m.seq; }));
                    (0, agentPersistence_1.initSeqCounter)(sessionId, maxSeq);
                    messages = persisted.map(agentPersistence_1.fromPersisted);
                    store = agentStore_1.useAgentStore.getState();
                    // Set messages directly — we need to build up the messagesBySession
                    for (_i = 0, messages_1 = messages; _i < messages_1.length; _i++) {
                        msg = messages_1[_i];
                        store.appendMessage(sessionId, msg);
                    }
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _c.sent();
                    console.error("Failed to load messages for session:", sessionId, err_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function useRestoreAgentSessions(workspaceId) {
    var _this = this;
    var restoredRef = (0, react_1.useRef)(new Set());
    (0, react_1.useEffect)(function () {
        if (!workspaceId)
            return;
        if (restoredRef.current.has(workspaceId))
            return;
        restoredRef.current.add(workspaceId);
        void (function () { return __awaiter(_this, void 0, void 0, function () {
            var sessions, _i, sessions_1, session, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, agent_1.agentIpc.loadPersistedSessions(workspaceId)];
                    case 1:
                        sessions = _a.sent();
                        for (_i = 0, sessions_1 = sessions; _i < sessions_1.length; _i++) {
                            session = sessions_1[_i];
                            restoreSessionToStores(session);
                            // Load messages eagerly for each restored session
                            void loadMessagesForSession(session.id);
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        err_2 = _a.sent();
                        console.error("Failed to restore agent sessions:", err_2);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); })();
    }, [workspaceId]);
}
