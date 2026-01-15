"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePushNotifications } from "@/hooks/use-push-notifications";

// Get local date key (YYYY-MM-DD) respecting user's timezone
function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Parse ISO string to local Date
function parseToLocalDate(isoString: string): Date {
  return new Date(isoString);
}

// Get user's timezone
function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

interface ContentItem {
  id: string;
  type: "post" | "article";
  title: string;
  fullText: string;
  contentType: string;
  scheduledAt: string | null;
  imageUrl: string | null;
  runId: string;
  runLabel: string;
  linkedinPostUrn: string | null;
  autoPublish: boolean;
}

interface DashboardClientProps {
  content: ContentItem[];
}

export function DashboardClient({ content }: DashboardClientProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [schedulingItem, setSchedulingItem] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [dayOffset, setDayOffset] = useState(0); // Days offset from today (for day-by-day nav)
  const { isSupported, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleItemId, setScheduleItemId] = useState<string | null>(null);
  const [scheduleAutoPublish, setScheduleAutoPublish] = useState(true);

  // Scroll to center day on mount/change (mobile)
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Center on the middle day (index 3) of the 7-day view
      const cardWidth = window.innerWidth * 0.85;
      const scrollPosition = 3 * cardWidth;
      scrollContainerRef.current.scrollTo({ left: scrollPosition, behavior: "instant" });
    }
  }, [dayOffset]); // Re-scroll when day offset changes

  // Split content
  // Scheduled = has scheduledAt date (regardless of publish status)
  // Unscheduled = no scheduledAt AND not yet published
  const scheduled = content.filter(c => c.scheduledAt);
  const unscheduled = content.filter(c => !c.scheduledAt && !c.linkedinPostUrn);

  // Get 7 days centered on today + dayOffset (3 days before, center day, 3 days after)
  const weekDates = useMemo(() => {
    const centerDate = new Date();
    centerDate.setDate(centerDate.getDate() + dayOffset);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(centerDate);
      date.setDate(centerDate.getDate() + (i - 3)); // -3 to +3 from center
      return date;
    });
  }, [dayOffset]);

  // Group scheduled content by date (using local timezone)
  const contentByDate = useMemo(() => {
    const groups: Record<string, ContentItem[]> = {};
    for (const item of scheduled) {
      if (!item.scheduledAt) continue;
      // Parse ISO string and get local date key
      const localDate = parseToLocalDate(item.scheduledAt);
      const dateKey = getLocalDateKey(localDate);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    }
    return groups;
  }, [scheduled]);

  const handlePublish = async (itemId: string) => {
    // Find the item to determine if it's a post or article
    const item = content.find(c => c.id === itemId);
    const endpoint = item?.type === "article"
      ? `/api/articles/${itemId}/publish-linkedin`
      : `/api/posts/${itemId}/publish-linkedin`;

    const response = await fetch(endpoint, {
      method: "POST",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to publish");
    }

    // Refresh to update the UI
    router.refresh();
  };

  // Open schedule modal for an item
  const openScheduleModal = (itemId: string, preSelectedDate?: Date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDate = preSelectedDate || tomorrow;

    // Get the item's current autoPublish setting
    const item = content.find(c => c.id === itemId);
    const defaultAutoPublish = item?.autoPublish ?? true;

    setScheduleItemId(itemId);
    setScheduleDate(defaultDate.toISOString().split("T")[0]);
    setScheduleTime("09:00");
    setScheduleAutoPublish(defaultAutoPublish);
    setShowScheduleModal(true);
    setSchedulingItem(null); // Close inline scheduling mode if open
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleItemId || !scheduleDate || !scheduleTime) return;

    const item = content.find(c => c.id === scheduleItemId);
    if (!item) return;

    setIsScheduling(true);

    try {
      // Combine date and time
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);

      const endpoint = item.type === "post"
        ? `/api/posts/${scheduleItemId}/schedule`
        : `/api/articles/${scheduleItemId}/schedule`;

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: scheduledDateTime.toISOString(),
          autoPublish: scheduleAutoPublish,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("Schedule failed:", err);
        alert("Failed to schedule. Please try again.");
        return;
      }

      // Close modal and refresh
      setShowScheduleModal(false);
      setScheduleItemId(null);
      router.refresh();
    } catch (err) {
      console.error("Schedule error:", err);
      alert("Failed to schedule. Please try again.");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleUnschedule = async (itemId: string) => {
    const item = content.find(c => c.id === itemId);
    if (!item) return;

    setIsScheduling(true);

    try {
      const endpoint = item.type === "post"
        ? `/api/posts/${itemId}/schedule`
        : `/api/articles/${itemId}/schedule`;

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: null }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("Unschedule failed:", err);
        alert("Failed to unschedule. Please try again.");
        return;
      }

      router.refresh();
    } catch (err) {
      console.error("Unschedule error:", err);
      alert("Failed to unschedule. Please try again.");
    } finally {
      setIsScheduling(false);
    }
  };

  // Legacy handler for inline calendar scheduling (still used for quick-pick)
  const handleSchedule = async (itemId: string, date: Date) => {
    // Open modal with pre-selected date instead of immediately scheduling
    openScheduleModal(itemId, date);
  };

  const handleDelete = async (itemId: string) => {
    const item = content.find(c => c.id === itemId);
    if (!item) return;

    const endpoint = item.type === "post"
      ? `/api/posts/${itemId}`
      : `/api/articles/${itemId}`;

    const res = await fetch(endpoint, { method: "DELETE" });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete");
    }

    router.refresh();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  if (content.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Welcome Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
            Welcome to LinWheel
          </h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
            Your AI-powered content suite for LinkedIn. Generate, schedule, and publish posts and articles that resonate.
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Generate Content - Primary CTA */}
          <Link
            href="/generate"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-6 text-white shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all hover:scale-[1.02]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="w-12 h-12 mb-4 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-1">Generate Content</h3>
              <p className="text-sm text-white/80">
                Turn transcripts into LinkedIn-ready posts and articles
              </p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium">
                Get started
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Compose Post */}
          <Link
            href="/compose"
            className="group rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg transition-all"
          >
            <div className="w-12 h-12 mb-4 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Compose Post</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Write and polish a custom LinkedIn post from scratch
            </p>
          </Link>

          {/* View Results */}
          <Link
            href="/results"
            className="group rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-lg transition-all"
          >
            <div className="w-12 h-12 mb-4 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">View Results</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Browse past generation runs and approve content
            </p>
          </Link>
        </div>

        {/* Secondary Actions */}
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
        </div>

        {/* Pro Tip */}
        <div className="mt-12 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">Pro tip</h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Start by generating content from a transcript. You&apos;ll get 7 unique post angles and optional long-form articles, all ready to schedule and publish.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Content Dashboard
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            {scheduled.length} scheduled • {unscheduled.length} ready to schedule
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick Compose button */}
          <Link
            href="/compose"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Post
          </Link>
          {/* Notification toggle */}
          {isSupported && (
            <button
              onClick={() => isSubscribed ? unsubscribe() : subscribe()}
              disabled={pushLoading}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                isSubscribed
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
              title={isSubscribed ? "Notifications enabled" : "Enable notifications"}
            >
              {pushLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : isSubscribed ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              )}
              <span className="hidden sm:inline">
                {isSubscribed ? "Reminders On" : "Enable Reminders"}
              </span>
            </button>
          )}

          {/* Day-by-day navigation */}
          <div className="flex items-center gap-2">
          <button
            onClick={() => setDayOffset(d => d - 1)}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title="Previous day"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setDayOffset(0)}
            className="px-3 py-1.5 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setDayOffset(d => d + 1)}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title="Next day"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          </div>
        </div>
      </div>

      {/* Mobile: Stack vertically, show horizontal scroll for days */}
      {/* Desktop: Side-by-side grid layout */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Calendar - shows first on mobile */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden order-1">
          {/* Mobile: Horizontal scrollable week */}
          <div className="lg:hidden">
            <div ref={scrollContainerRef} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              {weekDates.map((date, i) => {
                const dateKey = getLocalDateKey(date);
                const dayContent = contentByDate[dateKey] || [];
                const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
                const dayNum = date.getDate();
                const monthName = date.toLocaleDateString("en-US", { month: "short" });
                const isSelected = selectedDate === dateKey;

                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (!isPast(date)) {
                        setSelectedDate(isSelected ? null : dateKey);
                      }
                    }}
                    className={`flex-shrink-0 snap-start w-[85vw] p-4 border-r border-zinc-200 dark:border-zinc-800 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : isToday(date)
                        ? "bg-zinc-50 dark:bg-zinc-800/50"
                        : isPast(date)
                        ? "bg-zinc-100/50 dark:bg-zinc-900/50 cursor-not-allowed opacity-60"
                        : ""
                    }`}
                  >
                    {/* Day header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${
                          isToday(date)
                            ? "bg-blue-600 text-white"
                            : "bg-zinc-100 dark:bg-zinc-800"
                        }`}>
                          <span className={`text-xs font-medium uppercase ${
                            isToday(date) ? "text-blue-100" : "text-zinc-500 dark:text-zinc-400"
                          }`}>
                            {dayName}
                          </span>
                          <span className={`text-lg font-bold ${
                            isToday(date) ? "text-white" : "text-zinc-900 dark:text-zinc-100"
                          }`}>
                            {dayNum}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            {monthName} {dayNum}
                          </p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {dayContent.length} item{dayContent.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      {isToday(date) && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Day content */}
                    <div className="space-y-2 min-h-[120px]">
                      {dayContent.length === 0 ? (
                        <div className="flex items-center justify-center h-[120px] text-sm text-zinc-400 dark:text-zinc-500">
                          No content scheduled
                        </div>
                      ) : (
                        dayContent.map((item) => (
                          <CalendarItem key={item.id} item={item} onUnschedule={handleUnschedule} />
                        ))
                      )}
                    </div>

                    {/* Drop zone for mobile */}
                    {schedulingItem && !isPast(date) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSchedule(schedulingItem, date);
                          setSchedulingItem(null);
                        }}
                        className="w-full mt-3 p-3 border-2 border-dashed border-emerald-400 rounded-xl text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                      >
                        Schedule for {dayName}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Scroll indicator with navigation carets */}
            <div className="flex items-center justify-center gap-3 py-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setDayOffset(d => d - 1)}
                className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors"
                title="Previous day"
              >
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex gap-1.5">
                {weekDates.map((date, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      isToday(date)
                        ? "bg-blue-500"
                        : i === 3
                        ? "bg-zinc-500 dark:bg-zinc-400"
                        : "bg-zinc-300 dark:bg-zinc-600"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => setDayOffset(d => d + 1)}
                className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors"
                title="Next day"
              >
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Desktop: Grid layout */}
          <div className="hidden lg:block">
            {/* Week header */}
            <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
              {weekDates.map((date, i) => {
                const dateKey = getLocalDateKey(date);
                const dayContent = contentByDate[dateKey] || [];
                const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
                const dayNum = date.getDate();

                return (
                  <div
                    key={i}
                    className={`p-3 text-center border-r last:border-r-0 border-zinc-200 dark:border-zinc-800 ${
                      isToday(date) ? "bg-blue-50 dark:bg-blue-900/20" : ""
                    }`}
                  >
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                      {dayName}
                    </p>
                    <p className={`text-lg font-semibold mt-1 ${
                      isToday(date)
                        ? "text-blue-600 dark:text-blue-400"
                        : isPast(date)
                        ? "text-zinc-400 dark:text-zinc-600"
                        : "text-zinc-900 dark:text-zinc-100"
                    }`}>
                      {dayNum}
                    </p>
                    {dayContent.length > 0 && (
                      <div className="flex justify-center gap-0.5 mt-1">
                        {dayContent.slice(0, 3).map((_, j) => (
                          <div key={j} className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        ))}
                        {dayContent.length > 3 && (
                          <span className="text-[10px] text-zinc-500">+{dayContent.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Calendar body */}
            <div className="grid grid-cols-7 min-h-[400px]">
              {weekDates.map((date, i) => {
                const dateKey = getLocalDateKey(date);
                const dayContent = contentByDate[dateKey] || [];
                const isSelected = selectedDate === dateKey;

                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (!isPast(date)) {
                        setSelectedDate(isSelected ? null : dateKey);
                      }
                    }}
                    className={`border-r last:border-r-0 border-zinc-200 dark:border-zinc-800 p-2 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : isPast(date)
                        ? "bg-zinc-50 dark:bg-zinc-900/50 cursor-not-allowed"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <div className="space-y-2">
                      {dayContent.map((item) => (
                        <CalendarItem key={item.id} item={item} onUnschedule={handleUnschedule} />
                      ))}
                    </div>

                    {/* Drop zone indicator when scheduling */}
                    {schedulingItem && !isPast(date) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSchedule(schedulingItem, date);
                          setSchedulingItem(null);
                        }}
                        className="w-full mt-2 p-2 border-2 border-dashed border-emerald-400 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                      >
                        Drop here
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Unscheduled queue - shows second on mobile */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden order-2">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Ready to Schedule
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {unscheduled.length} items • Swipe calendar to pick a date
            </p>
          </div>

          <div className="p-3 space-y-2 max-h-[400px] lg:max-h-[500px] overflow-y-auto">
            {unscheduled.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                <p className="text-sm">All content scheduled!</p>
              </div>
            ) : (
              unscheduled.map((item) => (
                <QueueItem
                  key={item.id}
                  item={item}
                  isScheduling={schedulingItem === item.id}
                  onStartScheduling={() => setSchedulingItem(item.id)}
                  onCancelScheduling={() => setSchedulingItem(null)}
                  onOpenScheduleModal={() => openScheduleModal(item.id)}
                  onPublish={handlePublish}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Schedule Modal with date and time */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowScheduleModal(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Schedule Content</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Pick a date and time</p>
              </div>
            </div>

            {/* Date picker */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Time picker */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Time
              </label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {getUserTimezone()}
              </p>
            </div>

            {/* Auto-publish toggle */}
            <div className="mb-6">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Auto-publish
                  </span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {scheduleAutoPublish
                      ? "Will post to LinkedIn automatically"
                      : "Reminder only - you'll publish manually"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={scheduleAutoPublish}
                  onClick={() => setScheduleAutoPublish(!scheduleAutoPublish)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    scheduleAutoPublish
                      ? "bg-emerald-500"
                      : "bg-zinc-300 dark:bg-zinc-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      scheduleAutoPublish ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleSubmit}
                disabled={isScheduling || !scheduleDate || !scheduleTime}
                className="flex-1 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isScheduling ? "Scheduling..." : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarItem({ item, onUnschedule }: { item: ContentItem; onUnschedule?: (itemId: string) => void }) {
  const [isUnscheduling, setIsUnscheduling] = useState(false);
  const isPost = item.type === "post";
  const editUrl = isPost ? `/compose?draft=${item.id}` : `/article/${item.id}`;

  // Format scheduled time
  const scheduledTime = item.scheduledAt
    ? new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const handleUnschedule = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onUnschedule) return;
    setIsUnscheduling(true);
    try {
      await onUnschedule(item.id);
    } finally {
      setIsUnscheduling(false);
    }
  };

  return (
    <div
      className={`group relative rounded-lg p-2 transition-colors border-l-3 ${
        isPost
          ? "bg-blue-50 dark:bg-blue-900/20 border-l-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30"
          : "bg-purple-50 dark:bg-purple-900/20 border-l-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/30"
      }`}
    >
      <Link
        href={editUrl}
        onClick={(e) => e.stopPropagation()}
        className="block"
      >
        <div className="flex items-start gap-2">
          {item.imageUrl ? (
            <div className="relative w-8 h-8 rounded overflow-hidden flex-shrink-0">
              <Image src={item.imageUrl} alt="" fill className="object-cover" sizes="32px" />
            </div>
          ) : (
            <div className={`w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold ${
              isPost ? "bg-blue-500" : "bg-purple-500"
            }`}>
              {isPost ? "P" : "A"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded ${
                isPost
                  ? "bg-blue-500 text-white"
                  : "bg-purple-500 text-white"
              }`}>
                {isPost ? "Post" : "Article"}
              </span>
              {scheduledTime && (
                <span className="text-[9px] text-zinc-500 dark:text-zinc-400">
                  {scheduledTime}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">
              {item.title}
            </p>
          </div>
        </div>
      </Link>
      {/* Unschedule button - appears on hover */}
      {onUnschedule && (
        <button
          onClick={handleUnschedule}
          disabled={isUnscheduling}
          className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition-all"
          title="Unschedule"
        >
          {isUnscheduling ? (
            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

function QueueItem({
  item,
  isScheduling,
  onStartScheduling,
  onCancelScheduling,
  onOpenScheduleModal,
  onPublish,
  onDelete,
}: {
  item: ContentItem;
  isScheduling: boolean;
  onStartScheduling: () => void;
  onCancelScheduling: () => void;
  onOpenScheduleModal: () => void;
  onPublish: (itemId: string) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
}) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const isPost = item.type === "post";
  const isPublished = !!item.linkedinPostUrn;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(item.id);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishError(null);
    try {
      await onPublish(item.id);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  const editUrl = isPost ? `/compose?draft=${item.id}` : `/article/${item.id}`;

  return (
    <div className={`rounded-xl border-l-4 transition-all ${
      isScheduling
        ? "border-l-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-400"
        : isPost
        ? "border-l-blue-500 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
        : "border-l-purple-500 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
    }`}>
      {/* Clickable content area */}
      <Link
        href={editUrl}
        className="block p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors rounded-t-xl"
      >
        <div className="flex items-start gap-3">
          {item.imageUrl ? (
            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
              <Image src={item.imageUrl} alt="" fill className="object-cover" sizes="48px" />
            </div>
          ) : (
            <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center ${
              isPost
                ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                : "bg-gradient-to-br from-purple-500 to-violet-600"
            }`}>
              <span className="text-white text-sm font-bold">
                {isPost ? "P" : "A"}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded ${
                isPost
                  ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                  : "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
              }`}>
                {isPost ? "Post" : "Article"}
              </span>
              <span className="text-[10px] text-zinc-400 capitalize">
                {item.contentType.replace("_", " ")}
              </span>
            </div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">
              {item.title}
            </p>
          </div>
        </div>
      </Link>

      {/* Actions area */}
      <div className="px-3 pb-3">
        {/* Error message */}
        {publishError && (
          <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-xs text-red-600 dark:text-red-400">{publishError}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          {isScheduling ? (
            <>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex-1">
                Click a date on calendar
              </span>
              <button
                onClick={onCancelScheduling}
                className="px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Cancel
              </button>
            </>
          ) : isPublished ? (
            <a
              href={`https://www.linkedin.com/feed/update/${item.linkedinPostUrn}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg transition-colors hover:bg-blue-200 dark:hover:bg-blue-900/50"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
              </svg>
              View on LinkedIn
            </a>
          ) : (
            <>
              {/* Publish Now button */}
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  isPublishing
                    ? "bg-blue-300 text-white cursor-wait"
                    : "bg-blue-600 hover:bg-blue-500 text-white"
                }`}
              >
                {isPublishing ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                  </svg>
                )}
                {isPublishing ? "Publishing..." : "Publish Now"}
              </button>
              <button
                onClick={onOpenScheduleModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Schedule
              </button>
            </>
          )}
          {/* Delete button */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-auto"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Footer - show source run if available */}
      {item.runId && (
        <div className="flex border-t border-zinc-200 dark:border-zinc-700">
          <Link
            href={`/results/${item.runId}`}
            className="flex-1 px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-center"
          >
            From: {item.runLabel}
          </Link>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Delete {isPost ? "post" : "article"}?</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4 line-clamp-2">
              &ldquo;{item.title}&rdquo;
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
