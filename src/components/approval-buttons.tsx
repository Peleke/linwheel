"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface ApprovalButtonsProps {
  postId: string;
  approved: boolean;
}

export function ApprovalButtons({ postId, approved }: ApprovalButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticApproved, setOptimisticApproved] = useState(approved);

  const handleApproval = async (newApproved: boolean) => {
    // Optimistic update
    setOptimisticApproved(newApproved);

    try {
      const response = await fetch(`/api/posts/${postId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: newApproved }),
      });

      if (!response.ok) {
        // Revert on error
        setOptimisticApproved(approved);
        console.error("Failed to update approval status");
        return;
      }

      // Refresh page data
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      // Revert on error
      setOptimisticApproved(approved);
      console.error("Error updating approval:", error);
    }
  };

  return (
    <div className="flex gap-2">
      {optimisticApproved ? (
        <button
          onClick={() => handleApproval(false)}
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
        >
          {isPending ? "..." : "Unapprove"}
        </button>
      ) : (
        <button
          onClick={() => handleApproval(true)}
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors disabled:opacity-50"
        >
          {isPending ? "..." : "Approve"}
        </button>
      )}
    </div>
  );
}
