"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteRunButtonProps {
  runId: string;
  /** If true, redirect to /results after deletion */
  redirectAfter?: boolean;
}

export function DeleteRunButton({ runId, redirectAfter = false }: DeleteRunButtonProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/runs/${runId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete run");
      }

      if (redirectAfter) {
        router.push("/results");
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Error deleting run:", error);
      alert("Failed to delete run. Please try again.");
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
          Delete this run?
        </span>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors"
        >
          {isDeleting ? "Deleting..." : "Confirm"}
        </button>
        <button
          onClick={handleCancel}
          disabled={isDeleting}
          className="px-3 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleDelete}
      className="text-sm text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-colors"
    >
      Delete
    </button>
  );
}
