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
exports.StatusChecks = StatusChecks;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var STATUS_ICON = {
    SUCCESS: { icon: lucide_react_1.CheckCircle2, color: "text-green-400" },
    FAILURE: { icon: lucide_react_1.XCircle, color: "text-red-400" },
    ERROR: { icon: lucide_react_1.XCircle, color: "text-red-400" },
    PENDING: { icon: lucide_react_1.Circle, color: "text-yellow-400" },
    NEUTRAL: { icon: lucide_react_1.Circle, color: "text-muted-foreground" },
};
function StatusChecks(_a) {
    var checks = _a.checks;
    var _b = (0, react_1.useState)(false), expanded = _b[0], setExpanded = _b[1];
    if (!checks.length)
        return null;
    var passed = checks.filter(function (c) { return c.status === "SUCCESS"; }).length;
    var failed = checks.filter(function (c) { return c.status === "FAILURE" || c.status === "ERROR"; }).length;
    var total = checks.length;
    var allPassed = passed === total;
    var SummaryIcon = allPassed ? lucide_react_1.CheckCircle2 : failed > 0 ? lucide_react_1.XCircle : lucide_react_1.Circle;
    var summaryColor = allPassed
        ? "text-green-400"
        : failed > 0
            ? "text-red-400"
            : "text-yellow-400";
    return (<div className="rounded-md border border-border">
      {/* Summary */}
      <button type="button" onClick={function () { return setExpanded(!expanded); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent/50 transition-colors">
        <SummaryIcon className={(0, utils_1.cn)("h-4 w-4", summaryColor)}/>
        <span className="text-foreground">
          {passed}/{total} checks passed
        </span>
        <lucide_react_1.ChevronRight className={(0, utils_1.cn)("ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform", expanded && "rotate-90")}/>
      </button>

      {/* Details */}
      {expanded && (<div className="border-t border-border">
          {checks.map(function (check) { return (<CheckRow key={check.name} check={check}/>); })}
        </div>)}
    </div>);
}
function CheckRow(_a) {
    var _this = this;
    var _b;
    var check = _a.check;
    var _c = (_b = STATUS_ICON[check.status]) !== null && _b !== void 0 ? _b : STATUS_ICON.NEUTRAL, Icon = _c.icon, color = _c.color;
    var handleClick = function () { return __awaiter(_this, void 0, void 0, function () {
        var openUrl, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!check.url)
                        return [2 /*return*/];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("@tauri-apps/plugin-opener"); })];
                case 2:
                    openUrl = (_b.sent()).openUrl;
                    return [4 /*yield*/, openUrl(check.url)];
                case 3:
                    _b.sent();
                    return [3 /*break*/, 5];
                case 4:
                    _a = _b.sent();
                    // Fallback or ignore if not in Tauri context
                    window.open(check.url, "_blank");
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    return (<div className="flex items-center gap-2 px-3 py-1.5 text-xs">
      <Icon className={(0, utils_1.cn)("h-3.5 w-3.5 shrink-0", color)}/>
      <span className={(0, utils_1.cn)("truncate font-medium", check.url
            ? "cursor-pointer text-foreground hover:underline"
            : "text-foreground")} onClick={check.url ? handleClick : undefined}>
        {check.name}
      </span>
      {check.url && (<lucide_react_1.ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground cursor-pointer" onClick={handleClick}/>)}
      {check.description && (<span className="ml-auto truncate text-muted-foreground">
          {check.description}
        </span>)}
    </div>);
}
