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
  const scheduled = content.filter(c => c.scheduledAt);
  const unscheduled = content.filter(c => !c.scheduledAt);

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

  const handleSchedule = async (itemId: string, date: Date) => {
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
        body: JSON.stringify({ scheduledAt: date.toISOString() }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("Schedule failed:", err);
        alert("Failed to schedule. Please try again.");
        return;
      }

      // Refresh the page data
      router.refresh();
    } catch (err) {
      console.error("Schedule error:", err);
      alert("Failed to schedule. Please try again.");
    } finally {
      setIsScheduling(false);
      setSchedulingItem(null);
    }
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
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
          <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          No approved content yet
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-6">
          Approve some posts or articles to start scheduling
        </p>
        <Link
          href="/results"
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
        >
          View your runs
        </Link>
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
                          <CalendarItem key={item.id} item={item} />
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
                        <CalendarItem key={item.id} item={item} />
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
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarItem({ item }: { item: ContentItem }) {
  const isPost = item.type === "post";
  return (
    <div className={`group relative rounded-lg p-2 transition-colors border-l-3 ${
      isPost
        ? "bg-blue-50 dark:bg-blue-900/20 border-l-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30"
        : "bg-purple-50 dark:bg-purple-900/20 border-l-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/30"
    }`}>
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
          </div>
          <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">
            {item.title}
          </p>
        </div>
      </div>
    </div>
  );
}

function QueueItem({
  item,
  isScheduling,
  onStartScheduling,
  onCancelScheduling,
}: {
  item: ContentItem;
  isScheduling: boolean;
  onStartScheduling: () => void;
  onCancelScheduling: () => void;
}) {
  const isPost = item.type === "post";
  return (
    <div className={`rounded-xl border-l-4 transition-all ${
      isScheduling
        ? "border-l-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-400"
        : isPost
        ? "border-l-blue-500 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
        : "border-l-purple-500 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
    }`}>
      <div className="p-3">
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

        <div className="flex items-center gap-2 mt-3">
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
          ) : (
            <button
              onClick={onStartScheduling}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Schedule
            </button>
          )}
        </div>
      </div>

      <Link
        href={`/results/${item.runId}`}
        className="block px-3 py-2 border-t border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        From: {item.runLabel}
      </Link>
    </div>
  );
}
