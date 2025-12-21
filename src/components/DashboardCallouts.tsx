"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLiveData } from "@/contexts/LiveDataContext";

/**
 * Client-only component that displays callout alerts.
 * Prevents hydration mismatch by only rendering after mount.
 */
export function Callouts() {
  const [t] = useTranslation();
  const { showCallout } = useLiveData();
  const [mounted, setMounted] = useState(false);
  const [ishttps, setIsHttps] = useState(true);

  useEffect(() => {
    setMounted(true);if (typeof window !== "undefined") {
      setIsHttps(window.location.protocol === "https:");
    }
  }, []);

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  // If both conditions are met, don't show any callouts
  if (ishttps && !showCallout) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {!ishttps && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("warn_https")}</AlertTitle>
          <AlertDescription>
            {t("warn_https_desc", "You are using an insecure connection.")}
          </AlertDescription>
        </Alert>
      )}
      {!showCallout && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("warn_websocket")}</AlertTitle>
          <AlertDescription>
            {t("warn_websocket_desc", "WebSocket connection failed.")}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
