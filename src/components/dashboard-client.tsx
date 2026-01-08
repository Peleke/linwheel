"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [schedulingItem, setSchedulingItem] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Split content
  const scheduled = content.filter(c => c.scheduledAt);
  const unscheduled = content.filter(c => !c.scheduledAt);

  // Get current week dates
  const weekDates = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7));

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  }, [weekOffset]);

  // Group scheduled content by date
  const contentByDate = useMemo(() => {
    const groups: Record<string, ContentItem[]> = {};
    for (const item of scheduled) {
      if (!item.scheduledAt) continue;
      const dateKey = item.scheduledAt.split("T")[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    }
    return groups;
  }, [scheduled]);

  const handleSchedule = async (itemId: string, date: Date) => {
    const item = content.find(c => c.id === itemId);
    if (!item) return;

    const endpoint = item.type === "post"
      ? `/api/posts/${itemId}/schedule`
      : `/api/articles/${itemId}/schedule`;

    await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt: date.toISOString() }),
    });

    window.location.reload();
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

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-3 py-1.5 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Calendar */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {/* Week header */}
          <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
            {weekDates.map((date, i) => {
              const dateKey = date.toISOString().split("T")[0];
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
              const dateKey = date.toISOString().split("T")[0];
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

        {/* Unscheduled queue */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Ready to Schedule
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {unscheduled.length} items
            </p>
          </div>

          <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
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
  return (
    <div className="group relative bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
      <div className="flex items-start gap-2">
        {item.imageUrl ? (
          <div className="relative w-8 h-8 rounded overflow-hidden flex-shrink-0">
            <Image src={item.imageUrl} alt="" fill className="object-cover" sizes="32px" />
          </div>
        ) : (
          <div className={`w-8 h-8 rounded flex-shrink-0 ${
            item.type === "post"
              ? "bg-blue-500"
              : "bg-sky-500"
          }`} />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">
            {item.title}
          </p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 capitalize">
            {item.type} • {item.contentType.replace("_", " ")}
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
  return (
    <div className={`rounded-xl border transition-all ${
      isScheduling
        ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
        : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
    }`}>
      <div className="p-3">
        <div className="flex items-start gap-3">
          {item.imageUrl ? (
            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
              <Image src={item.imageUrl} alt="" fill className="object-cover" sizes="48px" />
            </div>
          ) : (
            <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center ${
              item.type === "post"
                ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                : "bg-gradient-to-br from-sky-500 to-cyan-600"
            }`}>
              <span className="text-white text-xs font-bold uppercase">
                {item.type[0]}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">
              {item.title}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 capitalize">
              {item.contentType.replace("_", " ")}
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
