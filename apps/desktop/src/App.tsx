import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { DeviceFlowDialog } from "@/components/auth/DeviceFlowDialog";
import { AppShell } from "@/components/layout/AppShell";
import { Loader2 } from "lucide-react";

export function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      {isAuthenticated ? <AppShell /> : <DeviceFlowDialog />}
    </TooltipProvider>
  );
}
