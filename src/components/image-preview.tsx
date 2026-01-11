"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

interface ImagePreviewProps {
  intentId: string;
  isArticle: boolean;
  generatedImageUrl?: string | null;
  headlineText: string;
  isApproved: boolean;
}

export function ImagePreview({
  intentId,
  isArticle,
  generatedImageUrl,
  headlineText,
  isApproved,
}: ImagePreviewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(
    generatedImageUrl ?? null
  );
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll for image if approved but no image yet
  useEffect(() => {
    if (!isApproved || imageUrl) {
      setIsPolling(false);
      return;
    }

    // Start polling
    setIsPolling(true);
    const pollInterval = setInterval(async () => {
      try {
        const endpoint = isArticle
          ? `/api/articles/image-intents/${intentId}`
          : `/api/posts/image-intents/${intentId}`;

        const res = await fetch(endpoint);
        if (!res.ok) return;

        const data = await res.json();
        if (data.generatedImageUrl) {
          setImageUrl(data.generatedImageUrl);
          setIsPolling(false);
          clearInterval(pollInterval);
        } else if (data.generationError) {
          setError(data.generationError);
          setIsPolling(false);
          clearInterval(pollInterval);
        }
      } catch {
        // Silently continue polling
      }
    }, 2000);

    // Clean up on unmount
    return () => clearInterval(pollInterval);
  }, [isApproved, imageUrl, intentId, isArticle]);

  // If we have an image, show it
  if (imageUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        data-testid="prompt-image-preview"
        className="relative rounded-lg overflow-hidden border border-emerald-200 dark:border-emerald-800 max-h-[300px]"
      >
        <div className="relative aspect-[1.91/1] w-full max-h-[300px]">
          <Image
            src={imageUrl}
            alt={headlineText}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <p className="text-white text-sm font-medium truncate">
            {headlineText}
          </p>
        </div>
        <div className="absolute top-2 right-2 px-2 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-lg">
          Generated
        </div>
      </motion.div>
    );
  }

  // If polling/generating, show loading state
  if (isPolling) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
        <div className="aspect-[1.91/1] w-full flex flex-col items-center justify-center gap-3 p-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 rounded-full border-3 border-violet-200 dark:border-violet-700 border-t-violet-500 dark:border-t-violet-400"
          />
          <div className="text-center">
            <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
              Generating image...
            </p>
            <p className="text-xs text-violet-500/70 dark:text-violet-400/70 mt-1">
              This may take a moment
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If there's an error, show it
  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-4">
        <div className="flex items-start gap-3">
          <span className="text-rose-500 text-lg">⚠️</span>
          <div>
            <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
              Image generation failed
            </p>
            <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-1">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Not approved yet - don't show placeholder (cleaner UI)
  return null;
}
