"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface ImageVersion {
  id: string;
  versionNumber: number;
  imageUrl: string | null;
  isActive: boolean;
  includeText: boolean;
  textPosition: string;
  generatedAt: string | null;
}

interface ImagePreviewProps {
  intentId: string;
  isArticle: boolean;
  generatedImageUrl?: string | null;
  headlineText: string;
  isApproved: boolean;
}

const TEXT_POSITIONS = [
  { value: "top", label: "Top" },
  { value: "center", label: "Center" },
  { value: "bottom", label: "Bottom" },
  { value: "top-left", label: "Top Left" },
  { value: "top-right", label: "Top Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" },
];

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Version state
  const [versions, setVersions] = useState<ImageVersion[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [includeText, setIncludeText] = useState(true);
  const [textPosition, setTextPosition] = useState("center");

  const endpoint = isArticle
    ? `/api/articles/image-intents/${intentId}`
    : `/api/posts/image-intents/${intentId}`;

  // Fetch versions
  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch(`${endpoint}/versions`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.versions && data.versions.length > 0) {
        setVersions(data.versions);
        // Find active version index
        const activeIndex = data.versions.findIndex((v: ImageVersion) => v.isActive);
        setCurrentVersionIndex(activeIndex >= 0 ? activeIndex : 0);
        // Set current image URL from active version
        const activeVersion = data.versions[activeIndex >= 0 ? activeIndex : 0];
        if (activeVersion?.imageUrl) {
          setImageUrl(activeVersion.imageUrl);
        }
      }
    } catch {
      // Silently fail
    }
  }, [endpoint]);

  // Fetch versions on mount if we have an image
  useEffect(() => {
    if (imageUrl || generatedImageUrl) {
      fetchVersions();
    }
  }, [fetchVersions, imageUrl, generatedImageUrl]);

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
        const res = await fetch(endpoint);
        if (!res.ok) return;

        const data = await res.json();
        if (data.generatedImageUrl) {
          setImageUrl(data.generatedImageUrl);
          setIsPolling(false);
          clearInterval(pollInterval);
          // Fetch versions after image is ready
          fetchVersions();
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
  }, [isApproved, imageUrl, intentId, isArticle, endpoint, fetchVersions]);

  // Navigate versions
  const goToPreviousVersion = async () => {
    if (currentVersionIndex >= versions.length - 1) return;
    const newIndex = currentVersionIndex + 1;
    const version = versions[newIndex];
    if (version) {
      // Set as active
      await fetch(`${endpoint}/versions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: version.id }),
      });
      setCurrentVersionIndex(newIndex);
      setImageUrl(version.imageUrl);
    }
  };

  const goToNextVersion = async () => {
    if (currentVersionIndex <= 0) return;
    const newIndex = currentVersionIndex - 1;
    const version = versions[newIndex];
    if (version) {
      // Set as active
      await fetch(`${endpoint}/versions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: version.id }),
      });
      setCurrentVersionIndex(newIndex);
      setImageUrl(version.imageUrl);
    }
  };

  // Regenerate image
  const handleRegenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeText, textPosition }),
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        setImageUrl(data.imageUrl);
        // Refresh versions
        await fetchVersions();
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to generate image");
    } finally {
      setIsGenerating(false);
      setShowOptions(false);
    }
  };

  const currentVersion = versions[currentVersionIndex];
  const hasMultipleVersions = versions.length > 1;
  const canGoPrevious = currentVersionIndex < versions.length - 1;
  const canGoNext = currentVersionIndex > 0;

  // If we have an image, show it with version controls
  if (imageUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative rounded-lg overflow-hidden border border-emerald-200 dark:border-emerald-800"
      >
        <div className="relative aspect-[1.91/1] w-full">
          <Image
            src={imageUrl}
            alt={headlineText}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>

        {/* Overlay with headline */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <p className="text-white text-sm font-medium truncate">
            {headlineText}
          </p>
        </div>

        {/* Version badge & navigation */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {hasMultipleVersions && (
            <>
              <button
                onClick={goToPreviousVersion}
                disabled={!canGoPrevious}
                className="p-1 bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed rounded text-white transition-colors"
                title="Previous version"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </>
          )}

          <span className="px-2 py-1 bg-emerald-500 text-white text-xs font-bold rounded shadow-lg">
            v{currentVersion?.versionNumber ?? 1}
            {hasMultipleVersions && ` / ${versions.length}`}
          </span>

          {hasMultipleVersions && (
            <button
              onClick={goToNextVersion}
              disabled={!canGoNext}
              className="p-1 bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed rounded text-white transition-colors"
              title="Next version"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Regenerate button */}
        <div className="absolute top-2 left-2">
          <button
            onClick={() => setShowOptions(!showOptions)}
            disabled={isGenerating}
            className="p-1.5 bg-black/50 hover:bg-black/70 rounded text-white transition-colors"
            title="Regenerate options"
          >
            {isGenerating ? (
              <motion.svg
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </motion.svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
        </div>

        {/* Regenerate options panel */}
        <AnimatePresence>
          {showOptions && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-12 left-2 right-2 bg-zinc-900/95 backdrop-blur-sm rounded-lg p-3 shadow-xl border border-zinc-700"
            >
              <div className="space-y-3">
                {/* Include text toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeText}
                    onChange={(e) => setIncludeText(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-zinc-200">Include headline text</span>
                </label>

                {/* Text position selector */}
                {includeText && (
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Text Position</label>
                    <select
                      value={textPosition}
                      onChange={(e) => setTextPosition(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      {TEXT_POSITIONS.map((pos) => (
                        <option key={pos.value} value={pos.value}>
                          {pos.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Generate button */}
                <button
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
                >
                  {isGenerating ? "Generating..." : "Generate New Version"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // If polling/generating, show loading state
  if (isPolling || isGenerating) {
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
          <div className="flex-1">
            <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
              Image generation failed
            </p>
            <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-1">
              {error}
            </p>
            <button
              onClick={() => setShowOptions(true)}
              className="mt-2 text-xs text-rose-600 dark:text-rose-400 hover:underline"
            >
              Try again with different options
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not approved yet - show placeholder with generate option
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <span className="text-lg">🖼️</span>
          <p className="text-sm">
            Image will be generated when post is approved
          </p>
        </div>
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Options
        </button>
      </div>

      {/* Pre-approval options */}
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeText}
                  onChange={(e) => setIncludeText(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600 dark:text-slate-300">Include headline text</span>
              </label>

              {includeText && (
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Text Position</label>
                  <select
                    value={textPosition}
                    onChange={(e) => setTextPosition(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded text-slate-700 dark:text-slate-200 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {TEXT_POSITIONS.map((pos) => (
                      <option key={pos.value} value={pos.value}>
                        {pos.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400">
                These settings will be used when the post is approved.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
