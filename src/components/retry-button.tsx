"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RetryButtonProps {
  runId: string;
}

export function RetryButton({ runId }: RetryButtonProps) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);

    try {
      const response = await fetch(`/api/runs/${runId}/retry`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to retry generation");
      }

      router.refresh();
    } catch (error) {
      console.error("Error retrying:", error);
      alert(error instanceof Error ? error.message : "Failed to retry generation");
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <button
      onClick={handleRetry}
      disabled={isRetrying}
      className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
    >
      {isRetrying ? "Retrying..." : "Retry Generation"}
    </button>
  );
}
