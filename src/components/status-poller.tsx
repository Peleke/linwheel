"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface StatusPollerProps {
  runId: string;
  status: string;
  pollInterval?: number;
}

/**
 * Client component that polls for status updates when a run is pending/processing.
 * Triggers a page refresh when the status changes to complete or failed.
 */
export function StatusPoller({
  runId,
  status,
  pollInterval = 3000,
}: StatusPollerProps) {
  const router = useRouter();

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/results/${runId}`);
      if (!response.ok) return;

      const data = await response.json();
      const newStatus = data.run?.status;

      // If status changed from processing to something else, refresh
      if (newStatus && newStatus !== status) {
        router.refresh();
      }
    } catch (error) {
      console.error("Status poll error:", error);
    }
  }, [runId, status, router]);

  useEffect(() => {
    // Only poll if status is pending or processing
    if (status !== "pending" && status !== "processing") {
      return;
    }

    // Initial check after a short delay
    const initialTimeout = setTimeout(checkStatus, 1000);

    // Then poll at regular intervals
    const interval = setInterval(checkStatus, pollInterval);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [status, pollInterval, checkStatus]);

  // This component doesn't render anything - it just handles polling
  return null;
}
