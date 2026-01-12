"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { FormattedTextarea } from "@/components/formatting-toolbar";
import { GenerateImageModal } from "@/components/generate-image-modal";
import { CarouselPreview } from "@/components/carousel-preview";
import { getStoredPreferences } from "@/hooks/use-image-preferences";
import Image from "next/image";
import ReactMarkdown from "react-markdown";

interface UserProfile {
  id: string;
  email: string;
  linkedin: {
    name: string;
    picture: string | null;
  } | null;
}

interface ArticleData {
  id: string;
  runId: string;
  articleType: string;
  title: string;
  subtitle: string | null;
  introduction: string;
  sections: string[];
  conclusion: string;
  fullText: string;
  versionNumber: number | null;
  approved: boolean;
  autoPublish: boolean | null;
  scheduledAt: string | null;
  linkedinPostUrn: string | null;
  linkedinPublishedAt: string | null;
  imageIntent: {
    id: string;
    headlineText: string;
    prompt: string;
    generatedImageUrl: string | null;
  } | null;
}

interface CarouselPage {
  pageNumber: number;
  slideType: "title" | "content" | "cta";
  prompt: string;
  headlineText: string;
  bodyText?: string;
  imageUrl?: string;
  activeVersionId?: string;
  versionCount?: number;
}

interface CarouselData {
  exists: boolean;
  id?: string;
  pageCount?: number;
  pages?: CarouselPage[];
  pdfUrl?: string;
  generatedAt?: string;
  provider?: string;
  error?: string;
  scheduledAt?: string | null;
  autoPublish?: boolean;
  status?: "pending" | "ready" | "scheduled" | "published";
  linkedinPostUrn?: string | null;
}

export default function ArticleEditPage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab state - default from URL query param if provided
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"write" | "preview" | "carousel">(
    initialTab === "carousel" ? "carousel" : initialTab === "preview" ? "preview" : "write"
  );

  // Article state
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [sections, setSections] = useState<string[]>([]);
  const [conclusion, setConclusion] = useState("");

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // Cover image state
  const [includeImageInPost, setIncludeImageInPost] = useState(true);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Carousel state
  const [carousel, setCarousel] = useState<CarouselData | null>(null);
  const [isLoadingCarousel, setIsLoadingCarousel] = useState(false);
  const [isGeneratingCarousel, setIsGeneratingCarousel] = useState(false);
  const [regeneratingSlide, setRegeneratingSlide] = useState<number | null>(null);
  const [carouselError, setCarouselError] = useState<string | null>(null);
  const [showCarouselScheduleModal, setShowCarouselScheduleModal] = useState(false);
  const [carouselScheduleMode, setCarouselScheduleMode] = useState<"simultaneous" | "stagger">("simultaneous");
  const [carouselScheduleDate, setCarouselScheduleDate] = useState("");
  const [carouselScheduleTime, setCarouselScheduleTime] = useState("09:00");
  const [isSchedulingCarousel, setIsSchedulingCarousel] = useState(false);
  const [isPublishingCarousel, setIsPublishingCarousel] = useState(false);

  // Publishing state
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [linkedinPostUrn, setLinkedinPostUrn] = useState<string | null>(null);

  // Native article publishing state
  const [isPublishingNative, setIsPublishingNative] = useState(false);
  const [nativePublishError, setNativePublishError] = useState<string | null>(null);

  // User profile state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

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

  // Load article
  useEffect(() => {
    const loadArticle = async () => {
      try {
        const res = await fetch(`/api/articles/${articleId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Article not found");
          } else {
            setError("Failed to load article");
          }
          return;
        }

        const data: ArticleData = await res.json();
        setArticle(data);
        setTitle(data.title);
        setSubtitle(data.subtitle || "");
        setIntroduction(data.introduction);
        setSections(data.sections);
        setConclusion(data.conclusion);
        setIsScheduled(!!data.scheduledAt);
        setScheduledAt(data.scheduledAt);
        setLinkedinPostUrn(data.linkedinPostUrn);

        // Load cover image settings
        const imageRes = await fetch(`/api/articles/${articleId}/cover-image`);
        if (imageRes.ok) {
          const imageData = await imageRes.json();
          if (imageData.exists) {
            setIncludeImageInPost(imageData.includeInPost ?? true);
          }
        }
      } catch (err) {
        console.error("Load article error:", err);
        setError("Failed to load article");
      } finally {
        setIsLoading(false);
      }
    };

    loadArticle();
  }, [articleId]);

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

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      // Build the full text from parts (sections already contain their own headings)
      const fullText = [
        `# ${title}`,
        subtitle ? `*${subtitle}*` : "",
        "",
        introduction,
        "",
        ...sections.filter(Boolean),
        "",
        conclusion,
      ].filter(Boolean).join("\n\n");

      const res = await fetch(`/api/articles/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          introduction: introduction.trim(),
          sections,
          conclusion: conclusion.trim(),
          fullText,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      setSuccessMessage("Article saved");
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save article");
    } finally {
      setIsSaving(false);
    }
  }, [articleId, title, subtitle, introduction, sections, conclusion]);

  const handleToggleImageInPost = async () => {
    const newValue = !includeImageInPost;
    setIncludeImageInPost(newValue); // Optimistic update

    try {
      const res = await fetch(`/api/articles/${articleId}/cover-image`, {
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
    setIsDeletingImage(true);
    setImageError(null);

    try {
      const res = await fetch(`/api/articles/${articleId}/cover-image`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setImageError(data.error || "Failed to delete cover image");
        return;
      }

      // Update local state - remove the image from article
      if (article) {
        setArticle({
          ...article,
          imageIntent: article.imageIntent ? { ...article.imageIntent, generatedImageUrl: null } : null,
        });
      }
      setIncludeImageInPost(true);
      setSuccessMessage("Cover image deleted");
    } catch (err) {
      console.error("Delete image error:", err);
      setImageError("Failed to delete cover image");
    } finally {
      setIsDeletingImage(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleDate || !scheduleTime) return;

    // Save any pending changes first
    await handleSave();

    setIsScheduling(true);
    setError(null);

    try {
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);

      const res = await fetch(`/api/articles/${articleId}/schedule`, {
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
      setSuccessMessage("Article scheduled!");
    } catch (err) {
      console.error("Schedule error:", err);
      setError("Failed to schedule article");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleUnschedule = async () => {
    setIsScheduling(true);
    setError(null);

    try {
      const res = await fetch(`/api/articles/${articleId}/schedule`, {
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
      setSuccessMessage("Article unscheduled");
    } catch (err) {
      console.error("Unschedule error:", err);
      setError("Failed to unschedule article");
    } finally {
      setIsScheduling(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishError(null);
    setError(null);

    try {
      const res = await fetch(`/api/articles/${articleId}/publish-linkedin`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setPublishError(data.error || "Failed to publish");
        return;
      }

      setLinkedinPostUrn(data.postUrn);
      setSuccessMessage("Article published to LinkedIn!");
    } catch (err) {
      console.error("Publish error:", err);
      setPublishError("Failed to publish article");
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishNative = async () => {
    setIsPublishingNative(true);
    setNativePublishError(null);
    setError(null);

    try {
      // First save any changes
      await handleSave();

      const res = await fetch(`/api/articles/${articleId}/publish-native`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "COOKIE_REQUIRED") {
          setNativePublishError("Please add your LinkedIn session cookie in Settings to publish native articles.");
        } else if (data.code === "COOKIE_EXPIRED") {
          setNativePublishError("Your LinkedIn session has expired. Please update your li_at cookie in Settings.");
        } else {
          setNativePublishError(data.error || "Failed to publish native article");
        }
        return;
      }

      setLinkedinPostUrn(data.articleUrl);
      setSuccessMessage("Native LinkedIn article published!");
    } catch (err) {
      console.error("Native publish error:", err);
      setNativePublishError("Failed to publish native article. Browser automation may not be available.");
    } finally {
      setIsPublishingNative(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/articles/${articleId}`, {
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
      setError("Failed to delete article");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getDefaultScheduleDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const handleSectionChange = (index: number, value: string) => {
    const newSections = [...sections];
    newSections[index] = value;
    setSections(newSections);
  };

  const addSection = () => {
    setSections([...sections, ""]);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  // Load carousel data
  const loadCarousel = useCallback(async () => {
    setIsLoadingCarousel(true);
    setCarouselError(null);
    try {
      // Get carousel status
      const carouselRes = await fetch(`/api/articles/${articleId}/carousel`);
      if (carouselRes.ok) {
        const carouselData = await carouselRes.json();

        // Also get schedule info if carousel exists
        if (carouselData.exists) {
          const scheduleRes = await fetch(`/api/articles/${articleId}/carousel/schedule`);
          if (scheduleRes.ok) {
            const scheduleData = await scheduleRes.json();
            setCarousel({
              ...carouselData,
              scheduledAt: scheduleData.scheduledAt,
              autoPublish: scheduleData.autoPublish,
              status: scheduleData.status,
              linkedinPostUrn: scheduleData.linkedinPostUrn,
            });
          } else {
            setCarousel(carouselData);
          }
        } else {
          setCarousel(carouselData);
        }
      }
    } catch (err) {
      console.error("Load carousel error:", err);
      setCarouselError("Failed to load carousel");
    } finally {
      setIsLoadingCarousel(false);
    }
  }, [articleId]);

  // Load carousel when switching to carousel tab
  useEffect(() => {
    if (activeTab === "carousel" && !carousel) {
      loadCarousel();
    }
  }, [activeTab, carousel, loadCarousel]);

  // Generate carousel
  const handleGenerateCarousel = async () => {
    setIsGeneratingCarousel(true);
    setCarouselError(null);
    try {
      const prefs = getStoredPreferences();
      const res = await fetch(`/api/articles/${articleId}/carousel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: prefs.provider,
          model: prefs.provider === "fal" ? prefs.falModel : prefs.openaiModel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCarouselError(data.error || "Failed to generate carousel");
        return;
      }

      // Reload carousel data
      await loadCarousel();
      setSuccessMessage("Carousel generated!");
    } catch (err) {
      console.error("Generate carousel error:", err);
      setCarouselError("Failed to generate carousel");
    } finally {
      setIsGeneratingCarousel(false);
    }
  };

  // Regenerate a single slide
  const handleRegenerateSlide = async (slideNumber: number) => {
    setRegeneratingSlide(slideNumber);
    setCarouselError(null);
    try {
      const prefs = getStoredPreferences();
      const res = await fetch(`/api/articles/${articleId}/carousel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideNumber,
          provider: prefs.provider,
          model: prefs.provider === "fal" ? prefs.falModel : prefs.openaiModel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCarouselError(data.error || "Failed to regenerate slide");
        return;
      }

      // Update carousel with new data
      setCarousel(prev => prev ? {
        ...prev,
        pages: data.pages,
        pdfUrl: data.pdfUrl,
      } : prev);
      setSuccessMessage(`Slide ${slideNumber} regenerated!`);
    } catch (err) {
      console.error("Regenerate slide error:", err);
      setCarouselError("Failed to regenerate slide");
    } finally {
      setRegeneratingSlide(null);
    }
  };

  // Schedule carousel
  const handleScheduleCarousel = async () => {
    // For simultaneous mode, article must be scheduled first
    if (carouselScheduleMode === "simultaneous" && !article?.scheduledAt) {
      setCarouselError("Schedule the article first to use simultaneous scheduling");
      return;
    }

    // For stagger mode, date/time must be provided
    if (carouselScheduleMode === "stagger" && (!carouselScheduleDate || !carouselScheduleTime)) {
      return;
    }

    setIsSchedulingCarousel(true);
    setCarouselError(null);
    try {
      // Build request body based on mode
      const requestBody = carouselScheduleMode === "simultaneous"
        ? {
            sharedSchedule: true,
            autoPublish: true,
          }
        : {
            scheduledAt: new Date(`${carouselScheduleDate}T${carouselScheduleTime}`).toISOString(),
            autoPublish: true,
          };

      const res = await fetch(`/api/articles/${articleId}/carousel/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      if (!res.ok) {
        setCarouselError(data.error || "Failed to schedule carousel");
        return;
      }

      setCarousel(prev => prev ? {
        ...prev,
        scheduledAt: data.scheduledAt,
        autoPublish: data.autoPublish,
        status: data.status,
      } : prev);
      setShowCarouselScheduleModal(false);
      setSuccessMessage("Carousel scheduled!");
    } catch (err) {
      console.error("Schedule carousel error:", err);
      setCarouselError("Failed to schedule carousel");
    } finally {
      setIsSchedulingCarousel(false);
    }
  };

  // Unschedule carousel
  const handleUnscheduleCarousel = async () => {
    setIsSchedulingCarousel(true);
    try {
      const res = await fetch(`/api/articles/${articleId}/carousel/schedule`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        setCarouselError(data.error || "Failed to unschedule carousel");
        return;
      }

      setCarousel(prev => prev ? {
        ...prev,
        scheduledAt: null,
        autoPublish: false,
        status: data.status,
      } : prev);
      setSuccessMessage("Carousel unscheduled");
    } catch (err) {
      console.error("Unschedule carousel error:", err);
      setCarouselError("Failed to unschedule carousel");
    } finally {
      setIsSchedulingCarousel(false);
    }
  };

  // Publish carousel immediately
  const handlePublishCarousel = async () => {
    setIsPublishingCarousel(true);
    setCarouselError(null);
    try {
      const res = await fetch(`/api/articles/${articleId}/carousel/publish`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        setCarouselError(data.error || "Failed to publish carousel");
        return;
      }

      setCarousel(prev => prev ? {
        ...prev,
        status: "published",
        linkedinPostUrn: data.postUrn,
      } : prev);
      setSuccessMessage("Carousel published to LinkedIn!");
    } catch (err) {
      console.error("Publish carousel error:", err);
      setCarouselError("Failed to publish carousel");
    } finally {
      setIsPublishingCarousel(false);
    }
  };

  // Handle image regeneration (open modal if intent exists, else generate first)
  const handleRegenerateImage = async () => {
    const intentId = article?.imageIntent?.id;
    if (intentId) {
      setShowImageModal(true);
      return;
    }

    // No intent exists - generate image first
    setIsGeneratingImage(true);
    setImageError(null);
    try {
      const prefs = getStoredPreferences();
      const res = await fetch(`/api/articles/${articleId}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: prefs.provider,
          model: prefs.provider === "fal" ? prefs.falModel : prefs.openaiModel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setImageError(data.error || "Failed to generate image");
        return;
      }

      // Update article with new image
      if (article) {
        setArticle({
          ...article,
          imageIntent: {
            ...article.imageIntent!,
            generatedImageUrl: data.imageUrl,
          },
        });
      }
      setSuccessMessage("Cover image generated!");
    } catch (err) {
      console.error("Generate image error:", err);
      setImageError("Failed to generate image");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Handle image generated via modal callback
  const handleImageGenerated = (imageUrl: string) => {
    if (article) {
      setArticle({
        ...article,
        imageIntent: article.imageIntent ? {
          ...article.imageIntent,
          generatedImageUrl: imageUrl,
        } : null,
      });
    }
    setSuccessMessage("Cover image regenerated!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  if (error && !article) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              {error}
            </h1>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-blue-600 hover:underline"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  const userName = userProfile?.linkedin?.name || "Your Name";
  const userPicture = userProfile?.linkedin?.picture;
  const coverImageUrl = article?.imageIntent?.generatedImageUrl;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-xs font-semibold uppercase bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded">
                  Article
                </span>
                <span className="text-xs text-zinc-500 capitalize">
                  {article?.articleType?.replace("_", " ")}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Edit Article
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
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete article"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving || !title.trim()}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>

              {/* Native Article Publishing */}
              {!linkedinPostUrn && article?.approved && (
                <div className="relative group">
                  <button
                    onClick={handlePublishNative}
                    disabled={isPublishingNative || !title.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPublishingNative ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                        </svg>
                        Publish Article
                      </>
                    )}
                  </button>
                  {/* Info tooltip */}
                  <div className="absolute -right-6 top-1/2 -translate-y-1/2">
                    <div className="relative group/tooltip">
                      <svg className="w-4 h-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="absolute bottom-full right-0 mb-2 w-72 p-3 bg-zinc-900 dark:bg-zinc-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50">
                        <p className="mb-1 font-medium">Native Article Publishing (Beta)</p>
                        <p className="text-zinc-300 mb-2">Uses browser automation to publish as a native LinkedIn article. Requires your li_at session cookie configured in Settings.</p>
                        <p className="text-zinc-400 text-[10px]">Note: This may take 30-60 seconds to complete.</p>
                        <div className="absolute bottom-0 right-4 translate-y-1/2 rotate-45 w-2 h-2 bg-zinc-900 dark:bg-zinc-800"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual LinkedIn article creation (fallback) */}
              {!linkedinPostUrn && (
                <a
                  href="https://www.linkedin.com/article/new/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                  title="Open LinkedIn article editor manually"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Manual
                </a>
              )}

              {/* Published badge */}
              {linkedinPostUrn && (
                <a
                  href={linkedinPostUrn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Published
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}

              {!isScheduled && (
                <button
                  onClick={() => {
                    setScheduleDate(getDefaultScheduleDate());
                    setShowScheduleModal(true);
                  }}
                  disabled={!title.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Schedule
                </button>
              )}

              <button
                onClick={() => router.push(`/results/${article?.runId}`)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                View Run
              </button>
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

          {publishError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
                {publishError}
              </p>
            </div>
          )}

          {nativePublishError && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
                {nativePublishError}
              </p>
            </div>
          )}

          {/* Cover Image */}
          {coverImageUrl && (
            <div className="mb-6 space-y-3">
              {imageError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">{imageError}</p>
                </div>
              )}
              <div className={`rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 ${!includeImageInPost ? "opacity-50" : ""}`}>
                <div className="relative">
                  <img
                    src={coverImageUrl}
                    alt="Article cover"
                    className="w-full aspect-[2/1] object-cover"
                  />
                  {!includeImageInPost && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/30">
                      <span className="px-3 py-1.5 bg-zinc-800/90 text-white text-sm font-medium rounded-lg">
                        Not included in post
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {/* Cover image controls */}
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeImageInPost}
                    onChange={handleToggleImageInPost}
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-purple-600 focus:ring-purple-500 dark:bg-zinc-800"
                  />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Include when publishing
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRegenerateImage}
                    disabled={isGeneratingImage}
                    className="px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                  >
                    {isGeneratingImage ? "Generating..." : "Regenerate"}
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
          )}

          {/* Generate Cover Image - shown when no image exists */}
          {!coverImageUrl && (
            <div className="mb-6">
              {imageError && (
                <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">{imageError}</p>
                </div>
              )}
              <button
                onClick={handleRegenerateImage}
                disabled={isGeneratingImage}
                className="w-full p-6 bg-white dark:bg-zinc-900 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-purple-400 dark:hover:border-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isGeneratingImage ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      Generating cover image...
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="w-8 h-8 text-zinc-400 dark:text-zinc-500 group-hover:text-purple-500 transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      Generate AI cover image
                    </span>
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Tab Bar */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-700 mb-0">
            <button
              onClick={() => setActiveTab("write")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "write"
                  ? "border-purple-600 text-purple-600 dark:text-purple-400"
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
                  ? "border-purple-600 text-purple-600 dark:text-purple-400"
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
            <button
              onClick={() => setActiveTab("carousel")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "carousel"
                  ? "border-amber-600 text-amber-600 dark:text-amber-400"
                  : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Carousel
                {carousel?.exists && (
                  <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                    carousel.status === "published" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" :
                    carousel.status === "scheduled" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                    "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                  }`}>
                    {carousel.status === "published" ? "Live" : carousel.status === "scheduled" ? "Scheduled" : carousel.pageCount}
                  </span>
                )}
              </span>
            </button>
          </div>

          {/* Editor / Preview Content */}
          {activeTab === "write" ? (
            <div className="bg-white dark:bg-zinc-900 rounded-b-xl border border-t-0 border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Article title..."
                  className="w-full px-4 py-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Subtitle (optional)
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="A brief tagline..."
                  className="w-full px-4 py-2 text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Introduction */}
              <FormattedTextarea
                label="Introduction"
                value={introduction}
                onChange={setIntroduction}
                placeholder="Set the stage for your article..."
                rows={4}
              />

              {/* Sections */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Sections
                  </label>
                  <button
                    onClick={addSection}
                    className="text-xs text-purple-600 hover:text-purple-500 font-medium"
                  >
                    + Add Section
                  </button>
                </div>
                <div className="space-y-4">
                  {sections.map((section, index) => (
                    <FormattedTextarea
                      key={index}
                      value={section}
                      onChange={(value) => handleSectionChange(index, value)}
                      placeholder={`Section ${index + 1} content...`}
                      rows={4}
                      header={
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-zinc-500">
                            Section {index + 1}
                          </span>
                          {sections.length > 1 && (
                            <button
                              onClick={() => removeSection(index)}
                              className="text-xs text-red-500 hover:text-red-400"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Conclusion */}
              <FormattedTextarea
                label="Conclusion"
                value={conclusion}
                onChange={setConclusion}
                placeholder="Wrap up your article..."
                rows={4}
              />
            </div>
          ) : activeTab === "preview" ? (
            <div className="bg-white dark:bg-zinc-900 rounded-b-xl border border-t-0 border-zinc-200 dark:border-zinc-800 p-6">
              {/* Preview */}
              <article className="prose prose-zinc dark:prose-invert max-w-none">
                {/* Author */}
                <div className="flex items-center gap-3 mb-6 not-prose">
                  {userPicture ? (
                    <Image
                      src={userPicture}
                      alt={userName}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-bold">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {userName}
                    </p>
                    <p className="text-xs text-zinc-500">Just now</p>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold mb-2">{title || "Untitled Article"}</h1>

                {/* Subtitle */}
                {subtitle && (
                  <p className="text-xl text-zinc-500 dark:text-zinc-400 italic mb-6">
                    {subtitle}
                  </p>
                )}

                {/* Introduction */}
                {introduction && (
                  <div className="mb-6 prose prose-zinc dark:prose-invert max-w-none">
                    <ReactMarkdown>{introduction}</ReactMarkdown>
                  </div>
                )}

                {/* Sections */}
                {sections.map((section, index) => (
                  section && (
                    <div key={index} className="mb-6 prose prose-zinc dark:prose-invert max-w-none">
                      <ReactMarkdown>{section}</ReactMarkdown>
                    </div>
                  )
                ))}

                {/* Conclusion */}
                {conclusion && (
                  <div className="mb-6 prose prose-zinc dark:prose-invert max-w-none">
                    <ReactMarkdown>{conclusion}</ReactMarkdown>
                  </div>
                )}
              </article>
            </div>
          ) : activeTab === "carousel" ? (
            <div className="bg-white dark:bg-zinc-900 rounded-b-xl border border-t-0 border-zinc-200 dark:border-zinc-800 p-6">
              {/* Carousel Tab Content */}
              {isLoadingCarousel ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !carousel?.exists ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                    No carousel yet
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 max-w-md mx-auto">
                    Generate a 5-slide carousel from your article content. Perfect for repurposing your article as a LinkedIn document post.
                  </p>
                  <button
                    onClick={handleGenerateCarousel}
                    disabled={isGeneratingCarousel}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl shadow-lg shadow-amber-500/25 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isGeneratingCarousel ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating Carousel...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Generate Carousel
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Carousel Error */}
                  {carouselError && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-700 dark:text-red-300">{carouselError}</p>
                    </div>
                  )}

                  {/* Carousel Status Bar */}
                  {carousel.status === "scheduled" && carousel.scheduledAt && (
                    <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Scheduled</p>
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            {new Date(carousel.scheduledAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleUnscheduleCarousel}
                        disabled={isSchedulingCarousel}
                        className="text-sm text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 underline"
                      >
                        {isSchedulingCarousel ? "..." : "Unschedule"}
                      </button>
                    </div>
                  )}

                  {carousel.status === "published" && carousel.linkedinPostUrn && (
                    <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                          <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Published to LinkedIn</p>
                      </div>
                      <a
                        href={`https://www.linkedin.com/feed/update/${carousel.linkedinPostUrn}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 underline"
                      >
                        View Post
                      </a>
                    </div>
                  )}

                  {/* Carousel Preview */}
                  {carousel.pages && (
                    <CarouselPreview
                      pages={carousel.pages}
                      pdfUrl={carousel.pdfUrl}
                      articleId={articleId}
                      onRegenerateSlide={handleRegenerateSlide}
                      regeneratingSlide={regeneratingSlide}
                    />
                  )}

                  {/* Carousel Actions */}
                  {carousel.status !== "published" && (
                    <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-700">
                      <button
                        onClick={handleGenerateCarousel}
                        disabled={isGeneratingCarousel}
                        className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {isGeneratingCarousel ? "Regenerating..." : "Regenerate All"}
                      </button>

                      <div className="flex items-center gap-3">
                        {carousel.status !== "scheduled" && (
                          <button
                            onClick={() => {
                              setCarouselScheduleDate(getDefaultScheduleDate());
                              setShowCarouselScheduleModal(true);
                            }}
                            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors"
                          >
                            Schedule
                          </button>
                        )}
                        <button
                          onClick={handlePublishCarousel}
                          disabled={isPublishingCarousel}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isPublishingCarousel ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Publishing...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                              </svg>
                              Publish Now
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </main>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Schedule Article
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
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
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
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50"
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
              Delete Article?
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              This action cannot be undone. The article and any associated images will be permanently deleted.
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

      {/* Carousel Schedule Modal */}
      {showCarouselScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Schedule Carousel
            </h3>

            <div className="space-y-4">
              {/* Schedule Mode Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  When to publish
                </label>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    carouselScheduleMode === "simultaneous"
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                  }`}>
                    <input
                      type="radio"
                      name="scheduleMode"
                      value="simultaneous"
                      checked={carouselScheduleMode === "simultaneous"}
                      onChange={() => setCarouselScheduleMode("simultaneous")}
                      className="mt-0.5 accent-amber-600"
                    />
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        Simultaneous
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Publish at the same time as the article
                        {article?.scheduledAt ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            {" "}({new Date(article.scheduledAt).toLocaleString()})
                          </span>
                        ) : (
                          <span className="text-red-500"> (Article not scheduled)</span>
                        )}
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    carouselScheduleMode === "stagger"
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                  }`}>
                    <input
                      type="radio"
                      name="scheduleMode"
                      value="stagger"
                      checked={carouselScheduleMode === "stagger"}
                      onChange={() => setCarouselScheduleMode("stagger")}
                      className="mt-0.5 accent-amber-600"
                    />
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        Stagger
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Choose a specific date and time
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Date/Time Picker (only for stagger mode) */}
              {carouselScheduleMode === "stagger" && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={carouselScheduleDate}
                      onChange={(e) => setCarouselScheduleDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={carouselScheduleTime}
                      onChange={(e) => setCarouselScheduleTime(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-amber-700 dark:text-amber-300">
                  Auto-publish enabled
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCarouselScheduleModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleCarousel}
                disabled={
                  isSchedulingCarousel ||
                  (carouselScheduleMode === "simultaneous" && !article?.scheduledAt) ||
                  (carouselScheduleMode === "stagger" && !carouselScheduleDate)
                }
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50"
              >
                {isSchedulingCarousel ? "Scheduling..." : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Generation Modal */}
      {showImageModal && article?.imageIntent?.id && (
        <GenerateImageModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          intentId={article.imageIntent.id}
          entityId={articleId}
          type="article"
          onImageGenerated={handleImageGenerated}
        />
      )}
    </div>
  );
}
