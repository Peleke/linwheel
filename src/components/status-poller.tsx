"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface StatusPollerProps {
  runId: string;
  status: string;
  /** Current post count (for progressive refresh) */
  postCount?: number;
  /** Current article count (for progressive refresh) */
  articleCount?: number;
  pollInterval?: number;
}

/**
 * Client component that polls for status updates when a run is pending/processing.
 * Triggers a page refresh when:
 * - Status changes to complete or failed
 * - New posts or articles are generated (progressive rendering)
 */
export function StatusPoller({
  runId,
  status,
  postCount = 0,
  articleCount = 0,
  pollInterval = 3000,
}: StatusPollerProps) {
  const router = useRouter();
  const lastCountRef = useRef({ posts: postCount, articles: articleCount });

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/results/${runId}`);
      if (!response.ok) return;

      const data = await response.json();
      const newStatus = data.run?.status;
      const newPostCount = data.posts?.length ?? 0;
      const newArticleCount = data.articles?.length ?? 0;

      // Refresh if status changed OR if new content was generated
      const statusChanged = newStatus && newStatus !== status;
      const contentAdded =
        newPostCount > lastCountRef.current.posts ||
        newArticleCount > lastCountRef.current.articles;

      if (statusChanged || contentAdded) {
        // Update ref before refresh to avoid double-refresh
        lastCountRef.current = { posts: newPostCount, articles: newArticleCount };
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
