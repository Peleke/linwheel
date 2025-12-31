"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GenerateImageModal } from "./generate-image-modal";

interface ApprovalButtonsProps {
  postId: string;
  approved: boolean;
  isArticle?: boolean;
  intentId?: string | null;
  hasImage?: boolean;
  imageUrl?: string | null;
}

export function ApprovalButtons({
  postId,
  approved,
  isArticle = false,
  intentId,
  hasImage,
  imageUrl,
}: ApprovalButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticApproved, setOptimisticApproved] = useState(approved);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);

  const handleApproval = async (newApproved: boolean) => {
    setOptimisticApproved(newApproved);

    const endpoint = isArticle
      ? `/api/articles/${postId}/approve`
      : `/api/posts/${postId}/approve`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: newApproved }),
      });

      if (!response.ok) {
        setOptimisticApproved(approved);
        console.error("Failed to update approval status");
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setOptimisticApproved(approved);
      console.error("Error updating approval:", error);
    }
  };

  const handleImageGenerated = (newImageUrl: string) => {
    setCurrentImageUrl(newImageUrl);
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* Approval Button - Icon only with tooltip */}
        {optimisticApproved ? (
          <motion.button
            onClick={() => handleApproval(false)}
            disabled={isPending}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
            title="Unapprove"
          >
            {isPending ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {/* Checkmark (default) */}
                <svg className="w-4 h-4 group-hover:hidden" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {/* X (on hover) */}
                <svg className="w-4 h-4 hidden group-hover:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </>
            )}
          </motion.button>
        ) : (
          <motion.button
            onClick={() => handleApproval(true)}
            disabled={isPending}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-50"
            title="Approve"
          >
            {isPending ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </motion.button>
        )}

        {/* Generate/Edit Image Button - Only show after approval and if intent exists */}
        {optimisticApproved && intentId && (
          <motion.button
            onClick={() => setShowImageModal(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-2 rounded-lg transition-colors ${
              currentImageUrl
                ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/30"
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            }`}
            title={currentImageUrl ? "Edit image" : "Generate image"}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </motion.button>
        )}

        {/* Image Ready Indicator - Icon only */}
        {currentImageUrl && (
          <span
            className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
            title="Image ready"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </span>
        )}
      </div>

      {/* Image Generation Modal */}
      {showImageModal && intentId && (
        <GenerateImageModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          intentId={intentId}
          type={isArticle ? "article" : "post"}
          onImageGenerated={handleImageGenerated}
        />
      )}
    </>
  );
}
