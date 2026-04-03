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
exports.DeviceFlowDialog = DeviceFlowDialog;
var react_1 = require("react");
var plugin_opener_1 = require("@tauri-apps/plugin-opener");
var lucide_react_1 = require("lucide-react");
var button_1 = require("@/components/ui/button");
var auth_1 = require("@/ipc/auth");
var authStore_1 = require("@/stores/authStore");
function DeviceFlowDialog() {
    var _a = (0, react_1.useState)("idle"), step = _a[0], setStep = _a[1];
    var _b = (0, react_1.useState)(null), deviceFlow = _b[0], setDeviceFlow = _b[1];
    var _c = (0, react_1.useState)(false), copied = _c[0], setCopied = _c[1];
    var _d = (0, react_1.useState)(null), error = _d[0], setError = _d[1];
    var pollingRef = (0, react_1.useRef)(null);
    var cancelledRef = (0, react_1.useRef)(false);
    var setAuthenticated = (0, authStore_1.useAuthStore)().setAuthenticated;
    (0, react_1.useEffect)(function () {
        return function () {
            cancelledRef.current = true;
            if (pollingRef.current)
                clearTimeout(pollingRef.current);
        };
    }, []);
    function startFlow() {
        return __awaiter(this, void 0, void 0, function () {
            var response, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        setStep("waiting");
                        setError(null);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, auth_1.authIpc.startDeviceFlow()];
                    case 2:
                        response = _a.sent();
                        setDeviceFlow(response);
                        return [4 /*yield*/, (0, plugin_opener_1.openUrl)(response.verificationUri)];
                    case 3:
                        _a.sent();
                        startPolling(response.deviceCode, response.interval);
                        return [3 /*break*/, 5];
                    case 4:
                        e_1 = _a.sent();
                        setError(String(e_1));
                        setStep("error");
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
    function startPolling(deviceCode, interval) {
        if (pollingRef.current)
            clearTimeout(pollingRef.current);
        cancelledRef.current = false;
        var pollInterval = Math.max(interval || 5, 6) * 1000; // minimum 6s to avoid slow_down
        var errorCount = 0;
        console.log("[Forge] Starting poll with deviceCode:", deviceCode, "interval:", pollInterval);
        function poll() {
            return __awaiter(this, void 0, void 0, function () {
                var result, user, e_2, errStr;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (cancelledRef.current)
                                return [2 /*return*/];
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 5, , 6]);
                            console.log("[Forge] Polling...");
                            return [4 /*yield*/, auth_1.authIpc.pollDeviceFlow(deviceCode)];
                        case 2:
                            result = _a.sent();
                            console.log("[Forge] Poll result:", result);
                            if (cancelledRef.current)
                                return [2 /*return*/];
                            errorCount = 0; // reset on successful poll
                            if (!result) return [3 /*break*/, 4];
                            console.log("[Forge] Got token, fetching user...");
                            return [4 /*yield*/, auth_1.authIpc.getUser()];
                        case 3:
                            user = _a.sent();
                            console.log("[Forge] User:", user);
                            setAuthenticated(user);
                            return [2 /*return*/]; // stop polling
                        case 4:
                            // Schedule next poll
                            pollingRef.current = setTimeout(poll, pollInterval);
                            return [3 /*break*/, 6];
                        case 5:
                            e_2 = _a.sent();
                            console.error("[Forge] Poll error:", e_2);
                            errStr = String(e_2);
                            errorCount++;
                            // Only give up after repeated fatal errors; transient issues get retried
                            if (errStr.includes("expired") || errorCount > 5) {
                                setError(errStr);
                                setStep("error");
                            }
                            else {
                                pollInterval = Math.min(pollInterval * 1.5, 60000);
                                console.log("[Forge] Transient error, retrying in", pollInterval, "ms (attempt", errorCount, ")");
                                pollingRef.current = setTimeout(poll, pollInterval);
                            }
                            return [3 /*break*/, 6];
                        case 6: return [2 /*return*/];
                    }
                });
            });
        }
        // First poll after initial delay
        pollingRef.current = setTimeout(poll, pollInterval);
    }
    function copyCode() {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(deviceFlow === null || deviceFlow === void 0 ? void 0 : deviceFlow.userCode)) return [3 /*break*/, 2];
                        return [4 /*yield*/, navigator.clipboard.writeText(deviceFlow.userCode)];
                    case 1:
                        _a.sent();
                        setCopied(true);
                        setTimeout(function () { return setCopied(false); }, 2000);
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    }
    return (<div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto w-full max-w-sm space-y-6 p-8">
        <div className="space-y-2 text-center">
          <div className="flex justify-center">
            <div className="rounded-xl bg-secondary p-4">
              <lucide_react_1.Github className="h-10 w-10"/>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to Forge</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with GitHub to get started
          </p>
        </div>

        {step === "idle" && (<button_1.Button onClick={startFlow} className="w-full" size="lg">
            <lucide_react_1.Github className="mr-2 h-5 w-5"/>
            Sign in with GitHub
          </button_1.Button>)}

        {step === "waiting" && deviceFlow && (<div className="space-y-4">
            <div className="rounded-lg border bg-card p-4 text-center">
              <p className="mb-2 text-xs text-muted-foreground">
                Enter this code on GitHub
              </p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-2xl font-bold tracking-widest">
                  {deviceFlow.userCode}
                </code>
                <button_1.Button variant="ghost" size="icon" onClick={copyCode}>
                  {copied ? (<lucide_react_1.Check className="h-4 w-4 text-green-500"/>) : (<lucide_react_1.Copy className="h-4 w-4"/>)}
                </button_1.Button>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <lucide_react_1.Loader2 className="h-4 w-4 animate-spin"/>
              Waiting for authorization...
            </div>
          </div>)}

        {step === "waiting" && !deviceFlow && (<div className="flex items-center justify-center">
            <lucide_react_1.Loader2 className="h-6 w-6 animate-spin"/>
          </div>)}

        {step === "error" && (<div className="space-y-3">
            <p className="text-center text-sm text-destructive">{error}</p>
            <button_1.Button onClick={startFlow} variant="outline" className="w-full">
              Try again
            </button_1.Button>
          </div>)}
      </div>
    </div>);
}
