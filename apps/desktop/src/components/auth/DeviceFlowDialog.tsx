import { useState, useEffect, useRef } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Loader2, Copy, Check, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authIpc } from "@/ipc/auth";
import { useAuthStore } from "@/stores/authStore";
import type { DeviceFlowResponse } from "@forge/shared";

export function DeviceFlowDialog() {
  const [step, setStep] = useState<"idle" | "waiting" | "error">("idle");
  const [deviceFlow, setDeviceFlow] = useState<DeviceFlowResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const { setAuthenticated } = useAuthStore();

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, []);

  async function startFlow() {
    setStep("waiting");
    setError(null);
    try {
      const response = await authIpc.startDeviceFlow();
      setDeviceFlow(response);
      await openUrl(response.verificationUri);
      startPolling(response.deviceCode, response.interval);
    } catch (e) {
      setError(String(e));
      setStep("error");
    }
  }

  function startPolling(deviceCode: string, interval: number) {
    if (pollingRef.current) clearTimeout(pollingRef.current);
    cancelledRef.current = false;
    let pollInterval = Math.max(interval || 5, 6) * 1000; // minimum 6s to avoid slow_down
    console.log("[Forge] Starting poll with deviceCode:", deviceCode, "interval:", pollInterval);

    async function poll() {
      if (cancelledRef.current) return;
      try {
        console.log("[Forge] Polling...");
        const result = await authIpc.pollDeviceFlow(deviceCode);
        console.log("[Forge] Poll result:", result);
        if (cancelledRef.current) return;
        if (result) {
          console.log("[Forge] Got token, fetching user...");
          const user = await authIpc.getUser();
          console.log("[Forge] User:", user);
          setAuthenticated(user);
          return; // stop polling
        }
        // Schedule next poll
        pollingRef.current = setTimeout(poll, pollInterval);
      } catch (e) {
        console.error("[Forge] Poll error:", e);
        // On slow_down or transient error, back off and retry
        const errStr = String(e);
        if (errStr.includes("slow_down") || errStr.includes("rate")) {
          pollInterval = Math.min(pollInterval * 2, 60000);
          console.log("[Forge] Backing off, new interval:", pollInterval);
          pollingRef.current = setTimeout(poll, pollInterval);
        } else {
          setError(errStr);
          setStep("error");
        }
      }
    }

    // First poll after initial delay
    pollingRef.current = setTimeout(poll, pollInterval);
  }

  async function copyCode() {
    if (deviceFlow?.userCode) {
      await navigator.clipboard.writeText(deviceFlow.userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto w-full max-w-sm space-y-6 p-8">
        <div className="space-y-2 text-center">
          <div className="flex justify-center">
            <div className="rounded-xl bg-secondary p-4">
              <Github className="h-10 w-10" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to Forge</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with GitHub to get started
          </p>
        </div>

        {step === "idle" && (
          <Button onClick={startFlow} className="w-full" size="lg">
            <Github className="mr-2 h-5 w-5" />
            Sign in with GitHub
          </Button>
        )}

        {step === "waiting" && deviceFlow && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-4 text-center">
              <p className="mb-2 text-xs text-muted-foreground">
                Enter this code on GitHub
              </p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-2xl font-bold tracking-widest">
                  {deviceFlow.userCode}
                </code>
                <Button variant="ghost" size="icon" onClick={copyCode}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for authorization...
            </div>
          </div>
        )}

        {step === "waiting" && !deviceFlow && (
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {step === "error" && (
          <div className="space-y-3">
            <p className="text-center text-sm text-destructive">{error}</p>
            <Button onClick={startFlow} variant="outline" className="w-full">
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
