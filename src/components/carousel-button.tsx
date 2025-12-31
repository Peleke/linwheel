"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getStoredPreferences } from "@/hooks/use-image-preferences";
import { CarouselPreview } from "./carousel-preview";

interface CarouselButtonProps {
  articleId: string;
  isApproved: boolean;
}

interface CarouselPage {
  pageNumber: number;
  slideType: "title" | "content" | "cta";
  prompt: string;
  headlineText: string;
  bodyText?: string;
  imageUrl?: string;
}

interface CarouselStatus {
  exists: boolean;
  id?: string;
  pageCount?: number;
  pages?: CarouselPage[];
  pdfUrl?: string;
  generatedAt?: string;
  error?: string;
}

export function CarouselButton({ articleId, isApproved }: CarouselButtonProps) {
  const [status, setStatus] = useState<CarouselStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch carousel status
  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/articles/${articleId}/carousel`);
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error("Failed to fetch carousel status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate carousel (with optional force regenerate)
  const handleGenerate = async (forceRegenerate = false) => {
    if (!isApproved) return;

    setIsGenerating(true);
    setError(null);

    // Get provider preference
    const prefs = getStoredPreferences();

    try {
      const res = await fetch(`/api/articles/${articleId}/carousel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: prefs.provider,
          model: prefs.provider === "fal" ? prefs.falModel : prefs.openaiModel,
          forceRegenerate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Carousel generation failed");
      }

      setStatus({
        exists: true,
        id: data.carouselId,
        pageCount: data.pageCount,
        pages: data.pages,
        pdfUrl: data.pdfUrl,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  // Delete carousel
  const handleDelete = async () => {
    if (!confirm("Delete this carousel? You can regenerate it later.")) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/articles/${articleId}/carousel`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }

      setStatus({ exists: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle expansion and fetch status if needed
  const handleToggle = () => {
    if (!isExpanded && !status) {
      fetchStatus();
    }
    setIsExpanded(!isExpanded);
  };

  const hasCarousel = status?.pages && status.pages.length > 0;

  return (
    <div className="px-4 py-3 bg-gradient-to-r from-amber-50/50 via-orange-50/30 to-amber-50/50 dark:from-amber-900/10 dark:via-orange-900/5 dark:to-amber-900/10 border-t border-amber-100 dark:border-amber-900/50">
      <button
        onClick={handleToggle}
        className="w-full text-left text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors flex items-center gap-2"
      >
        <span className="text-lg">📑</span>
        <span>Carousel (5 slides)</span>
        {isGenerating && (
          <span className="ml-2 text-xs text-amber-500 animate-pulse">
            generating...
          </span>
        )}
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-auto"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3">
              {/* Error display */}
              {error && (
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Loading state */}
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin h-8 w-8 border-3 border-amber-500 border-t-transparent rounded-full" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Loading carousel...
                    </p>
                  </div>
                </div>
              )}

              {/* Not approved state */}
              {!isLoading && !isApproved ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                  Approve the article to generate a carousel.
                </div>
              ) : !isLoading && hasCarousel ? (
                <div className="space-y-4 relative">
                  {/* Generating overlay */}
                  {isGenerating && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 rounded-lg flex flex-col items-center justify-center">
                      <div className="animate-spin text-3xl mb-3">🎨</div>
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        Regenerating carousel...
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Generating 5 background images + text overlays
                      </p>
                    </div>
                  )}

                  {/* Header with actions */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                      <span>✓</span>
                      <span>Carousel generated ({status?.pageCount} slides)</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Delete button */}
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting || isGenerating}
                        className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? "Deleting..." : "🗑 Delete"}
                      </button>

                      {/* Regenerate button */}
                      <button
                        onClick={() => handleGenerate(true)}
                        disabled={isGenerating || isDeleting}
                        className="text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors disabled:opacity-50"
                      >
                        {isGenerating ? (
                          <span className="flex items-center gap-1">
                            <span className="animate-spin">⏳</span>
                            Regenerating...
                          </span>
                        ) : (
                          "↻ Regenerate"
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Carousel Preview */}
                  <CarouselPreview
                    pages={status?.pages || []}
                    pdfUrl={status?.pdfUrl}
                    articleId={articleId}
                  />
                </div>
              ) : !isLoading && isApproved ? (
                /* No carousel - show generate button */
                <div className="space-y-3">
                  <button
                    onClick={() => handleGenerate(false)}
                    disabled={isGenerating}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                      isGenerating
                        ? "bg-amber-400 dark:bg-amber-600 cursor-wait text-white"
                        : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40"
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <span className="animate-spin">🎨</span>
                        Generating Carousel...
                      </>
                    ) : (
                      <>
                        <span>🎨</span>
                        Generate Carousel
                      </>
                    )}
                  </button>

                  {isGenerating && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                        <div className="animate-spin h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full" />
                        <span>Generating 5 slides with AI backgrounds + text overlays...</span>
                      </div>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        This may take 30-60 seconds
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
