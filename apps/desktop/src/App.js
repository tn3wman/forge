"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = App;
var react_1 = require("react");
var tooltip_1 = require("@/components/ui/tooltip");
var useAuth_1 = require("@/hooks/useAuth");
var DeviceFlowDialog_1 = require("@/components/auth/DeviceFlowDialog");
var AppShell_1 = require("@/components/layout/AppShell");
var settingsStore_1 = require("@/stores/settingsStore");
var lucide_react_1 = require("lucide-react");
function App() {
    var _a = (0, useAuth_1.useAuth)(), isAuthenticated = _a.isAuthenticated, isLoading = _a.isLoading;
    (0, react_1.useEffect)(function () {
        settingsStore_1.useSettingsStore.getState().loadSettings();
    }, []);
    if (isLoading) {
        return (<div className="flex h-screen items-center justify-center">
        <lucide_react_1.Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
      </div>);
    }
    return (<tooltip_1.TooltipProvider delayDuration={300}>
      {isAuthenticated ? <AppShell_1.AppShell /> : <DeviceFlowDialog_1.DeviceFlowDialog />}
    </tooltip_1.TooltipProvider>);
}
