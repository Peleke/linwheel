"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { FormattingToolbar } from "@/components/formatting-toolbar";
import { GenerateImageModal } from "@/components/generate-image-modal";
import { getStoredPreferences } from "@/hooks/use-image-preferences";
import Image from "next/image";

const LINKEDIN_CHAR_LIMIT = 3000;

interface UserProfile {
  id: string;
  email: string;
  linkedin: {
    name: string;
    picture: string | null;
  } | null;
}

function ComposePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draft");

  // Tab state
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");

  // Content state
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(!!draftId);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [postId, setPostId] = useState<string | null>(draftId);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [linkedinPostUrn, setLinkedinPostUrn] = useState<string | null>(null);

  // Cover image state
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isCoverImageExpanded, setIsCoverImageExpanded] = useState(true);
  const [includeImageInPost, setIncludeImageInPost] = useState(true);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [imageIntentId, setImageIntentId] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Schedule state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [isScheduling, setIsScheduling] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // User profile state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Textarea ref for formatting toolbar
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          setUserProfile(data);
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      }
    };
    loadProfile();
  }, []);

  // Load existing draft if provided
  useEffect(() => {
    if (!draftId) return;

    const loadDraft = async () => {
      try {
        const res = await fetch(`/api/posts/${draftId}`);
        if (res.ok) {
          const data = await res.json();
          setContent(data.fullText || "");
          setIsPublished(!!data.linkedinPostUrn);
          setLinkedinPostUrn(data.linkedinPostUrn);
          setIsScheduled(!!data.scheduledAt);
          setScheduledAt(data.scheduledAt);
        } else {
          setError("Failed to load draft");
        }

        // Also check for existing cover image
        const imageRes = await fetch(`/api/posts/${draftId}/cover-image`);
        if (imageRes.ok) {
          const imageData = await imageRes.json();
          if (imageData.exists) {
            setImageIntentId(imageData.intentId);
            if (imageData.generatedImageUrl) {
              setCoverImageUrl(imageData.generatedImageUrl);
            }
            setIncludeImageInPost(imageData.includeInPost ?? true);
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
      await handleSave();
    }

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

  const handleSchedule = async () => {
    if (!postId || !scheduleDate || !scheduleTime) return;

    // Save any pending changes first
    await handleSave();

    setIsScheduling(true);
    setError(null);

    try {
      // Combine date and time into ISO string
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);

      const res = await fetch(`/api/posts/${postId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: scheduledDateTime.toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to schedule");
        return;
      }

      setIsScheduled(true);
      setScheduledAt(scheduledDateTime.toISOString());
      setShowScheduleModal(false);
      setSuccessMessage("Post scheduled!");
    } catch (err) {
      console.error("Schedule error:", err);
      setError("Failed to schedule post");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleUnschedule = async () => {
    if (!postId) return;

    setIsScheduling(true);
    setError(null);

    try {
      const res = await fetch(`/api/posts/${postId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: null }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to unschedule");
        return;
      }

      setIsScheduled(false);
      setScheduledAt(null);
      setSuccessMessage("Post unscheduled");
    } catch (err) {
      console.error("Unschedule error:", err);
      setError("Failed to unschedule post");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!postId) return;

    // If we already have an intent, open the modal for customization
    if (imageIntentId) {
      setShowImageModal(true);
      return;
    }

    // First-time generation: create intent + generate image directly
    // (subsequent regenerations will use the modal)
    setIsGeneratingImage(true);
    setImageError(null);

    try {
      // Use stored provider preferences
      const prefs = getStoredPreferences();
      const res = await fetch(`/api/posts/${postId}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: prefs.provider,
          model: prefs.provider === "fal" ? prefs.falModel : prefs.openaiModel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setImageError(data.error || "Failed to generate cover image");
        return;
      }

      setCoverImageUrl(data.imageUrl);
      setImageIntentId(data.intentId); // Store intentId for future modal use
      setIncludeImageInPost(true); // Reset to included when generating new image
      setSuccessMessage("Cover image generated!");
    } catch (err) {
      console.error("Generate image error:", err);
      setImageError("Failed to generate cover image");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Callback when image is generated via modal
  const handleImageGenerated = (imageUrl: string) => {
    setCoverImageUrl(imageUrl);
    setIncludeImageInPost(true);
    setSuccessMessage("Cover image generated!");
  };

  const handleToggleImageInPost = async () => {
    if (!postId) return;

    const newValue = !includeImageInPost;
    setIncludeImageInPost(newValue); // Optimistic update

    try {
      const res = await fetch(`/api/posts/${postId}/cover-image`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeInPost: newValue }),
      });

      if (!res.ok) {
        setIncludeImageInPost(!newValue); // Revert on error
        setImageError("Failed to update image settings");
      }
    } catch (err) {
      console.error("Toggle image error:", err);
      setIncludeImageInPost(!newValue); // Revert on error
      setImageError("Failed to update image settings");
    }
  };

  const handleDeleteImage = async () => {
    if (!postId) return;

    setIsDeletingImage(true);
    setImageError(null);

    try {
      const res = await fetch(`/api/posts/${postId}/cover-image`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setImageError(data.error || "Failed to delete cover image");
        return;
      }

      setCoverImageUrl(null);
      setIncludeImageInPost(true);
      setSuccessMessage("Cover image deleted");
    } catch (err) {
      console.error("Delete image error:", err);
      setImageError("Failed to delete cover image");
    } finally {
      setIsDeletingImage(false);
    }
  };

  const handleDelete = async () => {
    if (!postId) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete");
        return;
      }

      // Redirect to dashboard after successful delete
      router.push("/dashboard");
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete post");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Get default schedule date (tomorrow)
  const getDefaultScheduleDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
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

  const userName = userProfile?.linkedin?.name || "Your Name";
  const userPicture = userProfile?.linkedin?.picture;

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
              {isScheduled && scheduledAt && (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-emerald-600 dark:text-emerald-400 text-sm">
                    Scheduled for {new Date(scheduledAt).toLocaleString()}
                  </p>
                  <button
                    onClick={handleUnschedule}
                    disabled={isScheduling}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 underline"
                  >
                    {isScheduling ? "..." : "Unschedule"}
                  </button>
                </div>
              )}
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
                  {postId && (
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete post"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={isSaving || isEmpty || isOverLimit}
                    className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Saving..." : "Save Draft"}
                  </button>

                  {postId && !isScheduled && (
                    <button
                      onClick={() => {
                        setScheduleDate(getDefaultScheduleDate());
                        setShowScheduleModal(true);
                      }}
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

          {/* Cover Image Section - Collapsible, at top */}
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
                    <div className="space-y-3">
                      <div className={`relative bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden ${!includeImageInPost ? "opacity-50" : ""}`}>
                        <img
                          src={coverImageUrl}
                          alt="Cover image"
                          className="w-full aspect-[1.91/1] object-cover"
                        />
                        {!includeImageInPost && (
                          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/30">
                            <span className="px-3 py-1.5 bg-zinc-800/90 text-white text-sm font-medium rounded-lg">
                              Not included in post
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Cover image controls */}
                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeImageInPost}
                            onChange={handleToggleImageInPost}
                            className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 dark:bg-zinc-800"
                          />
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">
                            Include when publishing
                          </span>
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleGenerateImage}
                            disabled={isGeneratingImage}
                            className="px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                          >
                            {isGeneratingImage ? "Regenerating..." : "Regenerate"}
                          </button>
                          <button
                            onClick={handleDeleteImage}
                            disabled={isDeletingImage}
                            className="px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                          >
                            {isDeletingImage ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
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
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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

          {/* Tab Bar */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-700 mb-0">
            <button
              onClick={() => setActiveTab("write")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "write"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Write
              </span>
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "preview"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </span>
            </button>
          </div>

          {/* Editor / Preview Content */}
          {activeTab === "write" ? (
            <div className="bg-white dark:bg-zinc-900 rounded-b-xl border border-t-0 border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <FormattingToolbar
                textareaRef={textareaRef}
                value={content}
                onChange={setContent}
              />
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What do you want to share?"
                className="w-full h-96 p-6 text-lg text-zinc-900 dark:text-zinc-100 bg-transparent resize-none focus:outline-none placeholder:text-zinc-400"
                autoFocus
              />

              {/* Footer */}
              <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
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
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-b-xl border border-t-0 border-zinc-200 dark:border-zinc-800 p-6">
              {content.trim() ? (
                <div className="flex items-start gap-3">
                  {userPicture ? (
                    <Image
                      src={userPicture}
                      alt={userName}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {userName}
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
              ) : (
                <div className="text-center py-12 text-zinc-400">
                  <p>Write something to see the preview</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Schedule Post
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-emerald-700 dark:text-emerald-300">
                  Auto-publish enabled
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedule}
                disabled={isScheduling || !scheduleDate}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {isScheduling ? "Scheduling..." : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Delete Post?
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              This action cannot be undone. The post and any associated cover images will be permanently deleted.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Generation Modal */}
      {showImageModal && imageIntentId && (
        <GenerateImageModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          intentId={imageIntentId}
          type="post"
          onImageGenerated={handleImageGenerated}
        />
      )}
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
