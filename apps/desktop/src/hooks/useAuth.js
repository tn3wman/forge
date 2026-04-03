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
exports.useAuth = useAuth;
var react_1 = require("react");
var authStore_1 = require("@/stores/authStore");
var auth_1 = require("@/ipc/auth");
function useAuth() {
    var _this = this;
    var store = (0, authStore_1.useAuthStore)();
    (0, react_1.useEffect)(function () {
        // Only check on initial mount when not yet authenticated
        if (!store.isAuthenticated && store.isLoading) {
            checkAuth();
        }
    }, []);
    function checkAuth() {
        return __awaiter(this, void 0, void 0, function () {
            var token, user, apiErr_1, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[Forge] checkAuth: checking keychain...");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 10, , 11]);
                        return [4 /*yield*/, auth_1.authIpc.getStoredToken()];
                    case 2:
                        token = _a.sent();
                        console.log("[Forge] checkAuth: token found:", !!token);
                        if (!token) return [3 /*break*/, 8];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 7]);
                        return [4 /*yield*/, auth_1.authIpc.getUser()];
                    case 4:
                        user = _a.sent();
                        console.log("[Forge] checkAuth: user fetched:", user.login);
                        store.setAuthenticated(user);
                        return [3 /*break*/, 7];
                    case 5:
                        apiErr_1 = _a.sent();
                        // Token is stale or revoked — clear it and show login screen.
                        console.warn("[Forge] checkAuth: stored token rejected, clearing:", apiErr_1);
                        return [4 /*yield*/, auth_1.authIpc.deleteStoredToken()];
                    case 6:
                        _a.sent();
                        store.setLoading(false);
                        return [3 /*break*/, 7];
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        store.setLoading(false);
                        _a.label = 9;
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        e_1 = _a.sent();
                        console.error("[Forge] checkAuth error:", e_1);
                        store.setLoading(false);
                        return [3 /*break*/, 11];
                    case 11: return [2 /*return*/];
                }
            });
        });
    }
    var handleLogout = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, auth_1.authIpc.deleteStoredToken()];
                case 1:
                    _a.sent();
                    store.logout();
                    return [2 /*return*/];
            }
        });
    }); }, [store.logout]);
    return {
        isAuthenticated: store.isAuthenticated,
        isLoading: store.isLoading,
        user: store.user,
        logout: handleLogout,
        checkAuth: checkAuth,
    };
}
