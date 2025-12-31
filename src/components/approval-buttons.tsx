"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
      <div className="flex flex-wrap items-center gap-2">
        {/* Approval Button */}
        {optimisticApproved ? (
          <button
            onClick={() => handleApproval(false)}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? "..." : "Unapprove"}
          </button>
        ) : (
          <button
            onClick={() => handleApproval(true)}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? "..." : "Approve"}
          </button>
        )}

        {/* Generate Image Button - Only show after approval and if intent exists */}
        {optimisticApproved && intentId && (
          <button
            onClick={() => setShowImageModal(true)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              currentImageUrl
                ? "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                : "text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {currentImageUrl ? "Edit Image" : "Generate Image"}
          </button>
        )}

        {/* Image Generated Indicator */}
        {currentImageUrl && (
          <span className="px-2 py-1 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Image ready
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
