"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ClearRunsButtonProps {
  runCount: number;
}

export function ClearRunsButton({ runCount }: ClearRunsButtonProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (runCount === 0) {
    return null;
  }

  const handleClear = async () => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch("/api/runs", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to clear runs");
      }

      router.refresh();
    } catch (error) {
      console.error("Error clearing runs:", error);
      alert("Failed to clear runs. Please try again.");
    } finally {
      setIsDeleting(false);
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    setIsConfirming(false);
  };

  if (isConfirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-600 dark:text-red-400">
          Delete {runCount} run{runCount !== 1 ? "s" : ""}?
        </span>
        <button
          onClick={handleClear}
          disabled={isDeleting}
          className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
        >
          {isDeleting ? "Deleting..." : "Confirm"}
        </button>
        <button
          onClick={handleCancel}
          disabled={isDeleting}
          className="px-3 py-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleClear}
      className="text-sm text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 transition-colors"
    >
      Clear all
    </button>
  );
}
