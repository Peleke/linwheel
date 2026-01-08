"use client";

import { useState } from "react";

interface PublishLinkedInButtonProps {
  postId: string;
  isApproved: boolean;
  linkedinPostUrn?: string | null;
  onPublished?: (postUrn: string, postUrl: string) => void;
}

export function PublishLinkedInButton({
  postId,
  isApproved,
  linkedinPostUrn,
  onPublished,
}: PublishLinkedInButtonProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Don't show if not approved or already published
  if (!isApproved) return null;

  // If already published, show link to view
  if (linkedinPostUrn) {
    const postUrl = `https://www.linkedin.com/feed/update/${linkedinPostUrn}`;
    return (
      <a
        href={postUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors"
        title="View on LinkedIn"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
        </svg>
        View
      </a>
    );
  }

  const handlePublish = async () => {
    setShowConfirm(false);
    setIsPublishing(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}/publish-linkedin`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to publish");
        return;
      }

      if (onPublished) {
        onPublished(data.postUrn, data.postUrl);
      }
    } catch (err) {
      console.error("Publish error:", err);
      setError("Failed to publish. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="relative">
      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="absolute bottom-full right-0 mb-2 p-3 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 z-10 min-w-[200px]">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">
            Publish this post to LinkedIn?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handlePublish}
              className="flex-1 px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Publish
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute bottom-full right-0 mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg z-10 max-w-[200px]">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-500 hover:text-red-700 mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Publish button */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isPublishing}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
          isPublishing
            ? "text-zinc-400 bg-zinc-100 dark:bg-zinc-800 cursor-wait"
            : "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
        }`}
        title="Publish to LinkedIn"
      >
        {isPublishing ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span className="sr-only">Publishing...</span>
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
            </svg>
            <span>Publish</span>
          </>
        )}
      </button>
    </div>
  );
}
