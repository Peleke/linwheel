"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface UnifiedScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleId: string;
  articleTitle: string;
  hasCarousel: boolean;
  articleScheduledAt?: string | null;
  carouselScheduledAt?: string | null;
  carouselStatus?: "pending" | "ready" | "scheduled" | "published";
  onArticleScheduled?: (scheduledAt: string) => void;
  onCarouselScheduled?: (scheduledAt: string) => void;
}

type TabType = "article" | "carousel";

export function UnifiedScheduleModal({
  isOpen,
  onClose,
  articleId,
  articleTitle,
  hasCarousel,
  articleScheduledAt,
  carouselScheduledAt,
  carouselStatus,
  onArticleScheduled,
  onCarouselScheduled,
}: UnifiedScheduleModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("article");

  // Article scheduling state
  const [articleDate, setArticleDate] = useState("");
  const [articleTime, setArticleTime] = useState("09:00");
  const [isSchedulingArticle, setIsSchedulingArticle] = useState(false);

  // Carousel scheduling state
  const [carouselMode, setCarouselMode] = useState<"simultaneous" | "stagger">("simultaneous");
  const [carouselDate, setCarouselDate] = useState("");
  const [carouselTime, setCarouselTime] = useState("09:00");
  const [isSchedulingCarousel, setIsSchedulingCarousel] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize dates
  useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split("T")[0];

      if (!articleDate) setArticleDate(dateStr);
      if (!carouselDate) setCarouselDate(dateStr);

      setError(null);
      setSuccess(null);
    }
  }, [isOpen, articleDate, carouselDate]);

  // Schedule article
  const handleScheduleArticle = async () => {
    if (!articleDate || !articleTime) return;

    setIsSchedulingArticle(true);
    setError(null);
    setSuccess(null);

    try {
      const scheduledAt = new Date(`${articleDate}T${articleTime}`).toISOString();

      const res = await fetch(`/api/articles/${articleId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to schedule article");
      }

      onArticleScheduled?.(data.scheduledAt);
      setSuccess("Article scheduled!");

      // If carousel exists and simultaneous mode, offer to schedule it too
      if (hasCarousel && carouselMode === "simultaneous") {
        setActiveTab("carousel");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setIsSchedulingArticle(false);
    }
  };

  // Schedule carousel
  const handleScheduleCarousel = async () => {
    if (carouselMode === "simultaneous" && !articleScheduledAt) {
      setError("Schedule the article first to use simultaneous mode");
      return;
    }

    if (carouselMode === "stagger" && (!carouselDate || !carouselTime)) {
      return;
    }

    setIsSchedulingCarousel(true);
    setError(null);
    setSuccess(null);

    try {
      const requestBody = carouselMode === "simultaneous"
        ? { sharedSchedule: true, autoPublish: true }
        : { scheduledAt: new Date(`${carouselDate}T${carouselTime}`).toISOString(), autoPublish: true };

      const res = await fetch(`/api/articles/${articleId}/carousel/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to schedule carousel");
      }

      onCarouselScheduled?.(data.scheduledAt);
      setSuccess("Carousel scheduled!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule carousel");
    } finally {
      setIsSchedulingCarousel(false);
    }
  };

  // Unschedule article
  const handleUnscheduleArticle = async () => {
    setIsSchedulingArticle(true);
    setError(null);
    try {
      const res = await fetch(`/api/articles/${articleId}/schedule`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to unschedule");
      }

      onArticleScheduled?.("");
      setSuccess("Article unscheduled");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unschedule");
    } finally {
      setIsSchedulingArticle(false);
    }
  };

  // Unschedule carousel
  const handleUnscheduleCarousel = async () => {
    setIsSchedulingCarousel(true);
    setError(null);
    try {
      const res = await fetch(`/api/articles/${articleId}/carousel/schedule`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to unschedule carousel");
      }

      onCarouselScheduled?.("");
      setSuccess("Carousel unscheduled");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unschedule");
    } finally {
      setIsSchedulingCarousel(false);
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
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Schedule
              </h2>
              <p className="text-sm text-zinc-500 truncate max-w-xs">
                {articleTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <button
              onClick={() => setActiveTab("article")}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "article"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Article
              {articleScheduledAt && (
                <span className="ml-1.5 inline-flex w-2 h-2 bg-emerald-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("carousel")}
              disabled={!hasCarousel}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "carousel"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              } ${!hasCarousel ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Carousel
              {carouselScheduledAt && (
                <span className="ml-1.5 inline-flex w-2 h-2 bg-amber-500 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-600 dark:text-emerald-400">
              {success}
            </div>
          )}

          {/* Article Tab */}
          {activeTab === "article" && (
            <div className="space-y-4">
              {articleScheduledAt ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium text-emerald-700 dark:text-emerald-300">
                        Article Scheduled
                      </span>
                    </div>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      {new Date(articleScheduledAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={handleUnscheduleArticle}
                    disabled={isSchedulingArticle}
                    className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSchedulingArticle ? "Unscheduling..." : "Unschedule Article"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={articleDate}
                      onChange={(e) => setArticleDate(e.target.value)}
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
                      value={articleTime}
                      onChange={(e) => setArticleTime(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      {Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </p>
                  </div>
                  <button
                    onClick={handleScheduleArticle}
                    disabled={isSchedulingArticle || !articleDate}
                    className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSchedulingArticle ? "Scheduling..." : "Schedule Article"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Carousel Tab */}
          {activeTab === "carousel" && (
            <div className="space-y-4">
              {!hasCarousel ? (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-center">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Generate a carousel first to schedule it.
                  </p>
                </div>
              ) : carouselStatus === "published" ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      Carousel Published
                    </span>
                  </div>
                </div>
              ) : carouselScheduledAt ? (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium text-amber-700 dark:text-amber-300">
                        Carousel Scheduled
                      </span>
                    </div>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      {new Date(carouselScheduledAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={handleUnscheduleCarousel}
                    disabled={isSchedulingCarousel}
                    className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSchedulingCarousel ? "Unscheduling..." : "Unschedule Carousel"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mode Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      When to publish
                    </label>
                    <div className="space-y-2">
                      <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        carouselMode === "simultaneous"
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      }`}>
                        <input
                          type="radio"
                          name="carouselMode"
                          value="simultaneous"
                          checked={carouselMode === "simultaneous"}
                          onChange={() => setCarouselMode("simultaneous")}
                          className="mt-0.5 accent-amber-600"
                        />
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            Simultaneous
                          </p>
                          <p className="text-xs text-zinc-500">
                            Same time as article
                            {articleScheduledAt ? (
                              <span className="text-amber-600"> ({new Date(articleScheduledAt).toLocaleString()})</span>
                            ) : (
                              <span className="text-red-500"> (Article not scheduled)</span>
                            )}
                          </p>
                        </div>
                      </label>

                      <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        carouselMode === "stagger"
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      }`}>
                        <input
                          type="radio"
                          name="carouselMode"
                          value="stagger"
                          checked={carouselMode === "stagger"}
                          onChange={() => setCarouselMode("stagger")}
                          className="mt-0.5 accent-amber-600"
                        />
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            Stagger
                          </p>
                          <p className="text-xs text-zinc-500">
                            Choose a specific date and time
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Date/Time for stagger mode */}
                  {carouselMode === "stagger" && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={carouselDate}
                          onChange={(e) => setCarouselDate(e.target.value)}
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
                          value={carouselTime}
                          onChange={(e) => setCarouselTime(e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleScheduleCarousel}
                    disabled={
                      isSchedulingCarousel ||
                      (carouselMode === "simultaneous" && !articleScheduledAt) ||
                      (carouselMode === "stagger" && !carouselDate)
                    }
                    className="w-full px-4 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSchedulingCarousel ? "Scheduling..." : "Schedule Carousel"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
