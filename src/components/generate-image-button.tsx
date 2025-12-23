"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { showToast } from "./toast";

interface GenerateImageButtonProps {
  intentId: string;
  isArticle?: boolean;
  existingImageUrl?: string | null;
  headlineText: string;
}

export function GenerateImageButton({
  intentId,
  isArticle = false,
  existingImageUrl,
  headlineText,
}: GenerateImageButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState(existingImageUrl);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentId, isArticle }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Image generation failed");
      }

      setImageUrl(data.imageUrl);
      setShowPreview(true);

      if (data.cached) {
        showToast("Loaded cached image", "info");
      } else {
        showToast("Image generated successfully!", "success");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative">
      {/* Generate Button */}
      <button
        onClick={imageUrl ? () => setShowPreview(true) : handleGenerate}
        disabled={isGenerating}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all ${
          imageUrl
            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
            : isGenerating
            ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 cursor-wait"
            : "bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-900/50"
        }`}
      >
        {isGenerating ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Generating...
          </>
        ) : imageUrl ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            View Image
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Generate Image
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}

      {/* Image Preview Modal */}
      <AnimatePresence>
        {showPreview && imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold truncate pr-4">
                  {headlineText}
                </h3>
                <div className="flex items-center gap-2">
                  <a
                    href={imageUrl}
                    download={`linwheel-${intentId}.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  >
                    Download
                  </a>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="p-1.5 text-white/60 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Image */}
              <div className="rounded-xl overflow-hidden shadow-2xl">
                <img
                  src={imageUrl}
                  alt={headlineText}
                  className="w-full h-auto"
                />
              </div>

              {/* Regenerate */}
              <div className="mt-4 flex justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPreview(false);
                    setImageUrl(null);
                    handleGenerate();
                  }}
                  className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Regenerate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
