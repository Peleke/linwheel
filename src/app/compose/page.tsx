"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";

const LINKEDIN_CHAR_LIMIT = 3000;

function ComposePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draft");

  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(!!draftId);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [postId, setPostId] = useState<string | null>(draftId);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [linkedinPostUrn, setLinkedinPostUrn] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isCoverImageExpanded, setIsCoverImageExpanded] = useState(true);

  // Load existing draft if provided
  useEffect(() => {
    if (!draftId) return;

    const loadDraft = async () => {
      try {
        const res = await fetch(`/api/posts/${draftId}`);
        if (res.ok) {
          const data = await res.json();
          setContent(data.fullText);
          setIsPublished(!!data.linkedinPostUrn);
          setLinkedinPostUrn(data.linkedinPostUrn);
        } else {
          setError("Failed to load draft");
        }

        // Also check for existing cover image
        const imageRes = await fetch(`/api/posts/${draftId}/image`);
        if (imageRes.ok) {
          const imageData = await imageRes.json();
          if (imageData.exists && imageData.generatedImageUrl) {
            setCoverImageUrl(imageData.generatedImageUrl);
          }
        }
      } catch (err) {
        console.error("Load draft error:", err);
        setError("Failed to load draft");
      } finally {
        setIsLoading(false);
      }
    };

    loadDraft();
  }, [draftId]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  const charCount = content.length;
  const isOverLimit = charCount > LINKEDIN_CHAR_LIMIT;
  const isEmpty = content.trim().length === 0;

  const handleSave = useCallback(async () => {
    if (isEmpty || isOverLimit) return;

    setIsSaving(true);
    setError(null);

    try {
      if (postId) {
        // Update existing draft
        const res = await fetch(`/api/posts/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullText: content }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to save");
          return;
        }

        setSuccessMessage("Draft saved");
      } else {
        // Create new draft
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullText: content }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to save");
          return;
        }

        const data = await res.json();
        setPostId(data.postId);
        // Update URL without reload
        window.history.replaceState({}, "", `/compose?draft=${data.postId}`);
        setSuccessMessage("Draft created");
      }
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  }, [content, isEmpty, isOverLimit, postId]);

  const handlePublish = async () => {
    if (isEmpty || isOverLimit) return;

    // Save first if needed
    let currentPostId = postId;
    if (!currentPostId) {
      setIsSaving(true);
      try {
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullText: content }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to save before publish");
          setIsSaving(false);
          return;
        }

        const data = await res.json();
        currentPostId = data.postId;
        setPostId(currentPostId);
      } catch (err) {
        console.error("Save before publish error:", err);
        setError("Failed to save before publish");
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    } else {
      // Save any pending changes
      await handleSave();
    }

    // Now publish
    setIsPublishing(true);
    setError(null);

    try {
      const res = await fetch(`/api/posts/${currentPostId}/publish-linkedin`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to publish");
        return;
      }

      setIsPublished(true);
      setLinkedinPostUrn(data.postUrn);
      setSuccessMessage("Published to LinkedIn!");
    } catch (err) {
      console.error("Publish error:", err);
      setError("Failed to publish to LinkedIn");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSchedule = () => {
    // Navigate to dashboard with this post ready to schedule
    if (postId) {
      router.push("/dashboard");
    }
  };

  const handleGenerateImage = async () => {
    if (!postId) return;

    setIsGeneratingImage(true);
    setImageError(null);

    try {
      const res = await fetch(`/api/posts/${postId}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        setImageError(data.error || "Failed to generate cover image");
        return;
      }

      setCoverImageUrl(data.imageUrl);
      setSuccessMessage("Cover image generated!");
    } catch (err) {
      console.error("Generate image error:", err);
      setImageError("Failed to generate cover image");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {postId ? "Edit Post" : "New Post"}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                Write your LinkedIn post
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isPublished && linkedinPostUrn ? (
                <a
                  href={`https://www.linkedin.com/feed/update/${linkedinPostUrn}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                  </svg>
                  View on LinkedIn
                </a>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || isEmpty || isOverLimit}
                    className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Saving..." : "Save Draft"}
                  </button>

                  {postId && (
                    <button
                      onClick={handleSchedule}
                      disabled={isEmpty || isOverLimit}
                      className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Schedule
                    </button>
                  )}

                  <button
                    onClick={handlePublish}
                    disabled={isPublishing || isEmpty || isOverLimit}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPublishing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                      </svg>
                    )}
                    {isPublishing ? "Publishing..." : "Publish Now"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Messages */}
          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {successMessage}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            </div>
          )}

          {/* Cover Image Section - Collapsible, above editor when editing */}
          {postId && !isPublished && (
            <div className="mb-6">
              <button
                onClick={() => setIsCoverImageExpanded(!isCoverImageExpanded)}
                className="w-full flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-zinc-500 dark:text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Cover Image
                  </span>
                  {coverImageUrl && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">
                      (Generated)
                    </span>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 text-zinc-500 transition-transform ${isCoverImageExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isCoverImageExpanded && (
                <div className="mt-3">
                  {imageError && (
                    <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-700 dark:text-red-300">{imageError}</p>
                    </div>
                  )}

                  {coverImageUrl ? (
                    <div className="relative bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                      <img
                        src={coverImageUrl}
                        alt="Cover image"
                        className="w-full aspect-[1.91/1] object-cover"
                      />
                      <button
                        onClick={handleGenerateImage}
                        disabled={isGeneratingImage}
                        className="absolute bottom-3 right-3 px-3 py-1.5 text-xs font-medium bg-white/90 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-white dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 shadow-sm"
                      >
                        {isGeneratingImage ? "Regenerating..." : "Regenerate"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage || isEmpty}
                      className="w-full p-6 bg-white dark:bg-zinc-900 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      {isGeneratingImage ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            Generating cover image...
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <svg
                            className="w-8 h-8 text-zinc-400 dark:text-zinc-500 group-hover:text-blue-500 transition-colors"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 4.5v15m7.5-7.5h-15"
                            />
                          </svg>
                          <span className="text-sm text-zinc-500 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            Generate AI cover image
                          </span>
                        </div>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Editor */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What do you want to share?"
              disabled={isPublished}
              className="w-full h-96 p-6 text-lg text-zinc-900 dark:text-zinc-100 bg-transparent resize-none focus:outline-none placeholder:text-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed"
              autoFocus
            />

            {/* Footer */}
            <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Character count */}
                <span className={`text-sm font-medium ${
                  isOverLimit
                    ? "text-red-600 dark:text-red-400"
                    : charCount > LINKEDIN_CHAR_LIMIT * 0.9
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}>
                  {charCount.toLocaleString()} / {LINKEDIN_CHAR_LIMIT.toLocaleString()}
                </span>

                {isOverLimit && (
                  <span className="text-xs text-red-600 dark:text-red-400">
                    {(charCount - LINKEDIN_CHAR_LIMIT).toLocaleString()} over limit
                  </span>
                )}
              </div>

              {postId && !isPublished && (
                <span className="text-xs text-zinc-400">
                  Draft saved
                </span>
              )}
            </div>
          </div>

          {/* LinkedIn Preview (optional) */}
          {content.trim() && !isOverLimit && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-3">
                Preview
              </h3>
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                    Y
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      Your Name
                    </p>
                    <p className="text-xs text-zinc-500">Just now</p>
                    <div className="mt-3 text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                      {content}
                    </div>
                    {coverImageUrl && (
                      <div className="mt-3 -mx-1 rounded-lg overflow-hidden">
                        <img
                          src={coverImageUrl}
                          alt="Cover"
                          className="w-full aspect-[1.91/1] object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ComposePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
          <AppHeader />
          <main className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </main>
        </div>
      }
    >
      <ComposePageContent />
    </Suspense>
  );
}
