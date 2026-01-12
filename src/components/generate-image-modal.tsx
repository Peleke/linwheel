"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { getStoredPreferences } from "@/hooks/use-image-preferences";
import {
  POST_IMAGE_SIZES,
  DEFAULT_POST_IMAGE_SIZE,
  type PostImageSizeKey,
} from "@/lib/linkedin-image-config";

interface ImageIntent {
  id: string;
  prompt: string;
  negativePrompt: string | null;
  headlineText: string | null;
  stylePreset: string;
  generatedImageUrl: string | null;
  generationError: string | null;
}

interface GenerateImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  intentId: string;
  type: "post" | "article";
  onImageGenerated?: (imageUrl: string) => void;
}

const STYLE_PRESETS = [
  { value: "typographic_minimal", label: "Typographic Minimal", description: "Clean, bold typography with white space" },
  { value: "gradient_text", label: "Gradient Text", description: "Modern gradient backgrounds with text" },
  { value: "dark_mode", label: "Dark Mode", description: "Sleek dark backgrounds with bright accents" },
  { value: "accent_bar", label: "Accent Bar", description: "Bold colored accent bar design" },
  { value: "abstract_shapes", label: "Abstract Shapes", description: "Geometric shapes with soft gradients" },
] as const;

export function GenerateImageModal({
  isOpen,
  onClose,
  intentId,
  type,
  onImageGenerated,
}: GenerateImageModalProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<ImageIntent | null>(null);

  // Form state
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [headlineText, setHeadlineText] = useState("");
  const [stylePreset, setStylePreset] = useState("typographic_minimal");
  const [imageSize, setImageSize] = useState<PostImageSizeKey>(DEFAULT_POST_IMAGE_SIZE);

  // Generated image
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Portal mount point
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const apiBase = type === "post"
    ? `/api/posts/image-intents/${intentId}`
    : `/api/articles/image-intents/${intentId}`;

  // Fetch intent data
  const fetchIntent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(apiBase);
      if (!res.ok) {
        throw new Error("Failed to fetch image intent");
      }

      const data = await res.json();
      setIntent(data);
      setPrompt(data.prompt || "");
      setNegativePrompt(data.negativePrompt || "");
      setHeadlineText(data.headlineText || "");
      setStylePreset(data.stylePreset || "typographic_minimal");
      setGeneratedImageUrl(data.generatedImageUrl);
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load intent");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (isOpen && intentId) {
      fetchIntent();
    }
  }, [isOpen, intentId, fetchIntent]);

  // Track changes
  useEffect(() => {
    if (intent) {
      const changed =
        prompt !== (intent.prompt || "") ||
        negativePrompt !== (intent.negativePrompt || "") ||
        headlineText !== (intent.headlineText || "") ||
        stylePreset !== (intent.stylePreset || "typographic_minimal");
      setHasChanges(changed);
    }
  }, [prompt, negativePrompt, headlineText, stylePreset, intent]);

  // Save changes
  const handleSaveChanges = async () => {
    try {
      setError(null);
      const res = await fetch(apiBase, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, negativePrompt, headlineText, stylePreset }),
      });

      if (!res.ok) {
        throw new Error("Failed to save changes");
      }

      const data = await res.json();
      setIntent(prev => prev ? { ...prev, ...data.intent } : prev);
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  // Generate image
  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);

      // Save changes first if any
      if (hasChanges) {
        await handleSaveChanges();
      }

      // Get provider preferences
      const prefs = getStoredPreferences();

      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: prefs.provider,
          model: prefs.provider === "fal" ? prefs.falModel : prefs.openaiModel,
          // Only pass imageSize for posts (articles have fixed dimensions)
          ...(type === "post" && { imageSize }),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Image generation failed");
      }

      setGeneratedImageUrl(data.imageUrl);
      onImageGenerated?.(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Generate Image
            </h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Customize your prompts and generate a cover image
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Generated Image Preview */}
              {generatedImageUrl && (
                <div className="relative rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                  <img
                    src={generatedImageUrl}
                    alt="Generated cover"
                    className="w-full object-cover"
                    style={{
                      aspectRatio: type === "post"
                        ? `${POST_IMAGE_SIZES[imageSize].width}/${POST_IMAGE_SIZES[imageSize].height}`
                        : "1200/644"
                    }}
                  />
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 text-xs font-medium bg-green-500/90 text-white rounded-full">
                      Generated
                    </span>
                  </div>
                </div>
              )}

              {/* Prompt Input */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Prompt
                  <span className="text-neutral-400 font-normal ml-1">(what to generate)</span>
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none"
                  placeholder="Describe the image you want to generate..."
                />
              </div>

              {/* Negative Prompt Input */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Negative Prompt
                  <span className="text-neutral-400 font-normal ml-1">(what to avoid)</span>
                </label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none"
                  placeholder="blurry, low quality, text errors..."
                />
              </div>

              {/* Headline Text Input */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Headline Text
                  <span className="text-neutral-400 font-normal ml-1">(text to render in image)</span>
                </label>
                <input
                  type="text"
                  value={headlineText}
                  onChange={(e) => setHeadlineText(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  placeholder="Your headline text..."
                />
              </div>

              {/* Style Preset */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                  Style Preset
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STYLE_PRESETS.map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setStylePreset(style.value)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        stylePreset === style.value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                      }`}
                    >
                      <div className="font-medium text-sm text-neutral-900 dark:text-white">
                        {style.label}
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5 line-clamp-1">
                        {style.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Size - Only for posts */}
              {type === "post" && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                    Image Size
                    <span className="text-neutral-400 font-normal ml-1">(LinkedIn recommended)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(POST_IMAGE_SIZES) as [PostImageSizeKey, typeof POST_IMAGE_SIZES[PostImageSizeKey]][]).map(([key, size]) => (
                      <button
                        key={key}
                        onClick={() => setImageSize(key)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          imageSize === key
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                        }`}
                      >
                        <div className="font-medium text-sm text-neutral-900 dark:text-white">
                          {size.label.split(" ")[0]}
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          {size.width}×{size.height}
                        </div>
                        <div className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                          {size.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-200">Generation Failed</p>
                      <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
            >
              Cancel
            </button>

            {hasChanges && (
              <button
                onClick={handleSaveChanges}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Save Changes
              </button>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating || loading}
              className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {generatedImageUrl ? "Regenerate" : "Generate Image"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document body level, escaping any overflow:hidden parents
  return createPortal(modalContent, document.body);
}
