"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { DayPicker } from "react-day-picker";
import { format, setHours, setMinutes, addDays, startOfDay, isBefore } from "date-fns";
import "react-day-picker/style.css";

interface ApprovedPost {
  id: string;
  hook: string;
  fullText: string;
  postType: string;
  scheduledAt?: Date | null;
  imageUrl?: string | null;
}

interface ApprovedArticle {
  id: string;
  title: string;
  fullText: string;
  articleType: string;
  scheduledAt?: Date | null;
  imageUrl?: string | null;
}

interface ApprovedContentPanelProps {
  posts: ApprovedPost[];
  articles: ApprovedArticle[];
  runId: string;
}

export function ApprovedContentPanel({
  posts,
  articles,
}: ApprovedContentPanelProps) {
  const [activeScheduler, setActiveScheduler] = useState<string | null>(null);
  const totalApproved = posts.length + articles.length;

  if (totalApproved === 0) {
    return (
      <div className="mb-8 p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
          <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium">No approved content yet</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Approve posts or articles below to see them here</p>
          </div>
        </div>
      </div>
    );
  }

  // Combine and sort by type for unified display
  const allContent = [
    ...posts.map(p => ({ ...p, type: "post" as const, label: p.hook, contentType: p.postType })),
    ...articles.map(a => ({ ...a, type: "article" as const, label: a.title, contentType: a.articleType })),
  ];

  return (
    <div className="mb-8">
      {/* Compact header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {totalApproved} Approved
          </span>
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Scroll to view all
        </span>
      </div>

      {/* Horizontal scroll container */}
      <div className="relative -mx-4 px-4 sm:-mx-8 sm:px-8">
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
          {allContent.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              isSchedulerOpen={activeScheduler === item.id}
              onToggleScheduler={() => setActiveScheduler(activeScheduler === item.id ? null : item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ContentItem {
  id: string;
  type: "post" | "article";
  label: string;
  fullText: string;
  contentType: string;
  scheduledAt?: Date | null;
  imageUrl?: string | null;
}

function ContentCard({
  item,
  isSchedulerOpen,
  onToggleScheduler,
}: {
  item: ContentItem;
  isSchedulerOpen: boolean;
  onToggleScheduler: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(item.fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <div className="flex-shrink-0 snap-start w-[280px] sm:w-[320px]">
        <div className="relative rounded-xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm group">
          {/* Image or gradient background */}
          <div className="relative aspect-[16/9] overflow-hidden">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.label}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="320px"
              />
            ) : (
              <div className={`absolute inset-0 ${
                item.type === "post"
                  ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                  : "bg-gradient-to-br from-sky-500 to-cyan-600"
              }`} />
            )}

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* Type badge */}
            <div className="absolute top-2 left-2">
              <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full ${
                item.type === "post"
                  ? "bg-blue-500/90 text-white"
                  : "bg-sky-500/90 text-white"
              }`}>
                {item.type}
              </span>
            </div>

            {/* Scheduled badge */}
            {item.scheduledAt && (
              <div className="absolute top-2 right-2">
                <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-500 text-white rounded-full flex items-center gap-1">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatShortDate(item.scheduledAt)}
                </span>
              </div>
            )}

            {/* Content label */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-white text-sm font-medium line-clamp-2 leading-snug">
                {item.label}
              </p>
              <p className="text-white/70 text-xs mt-1 capitalize">
                {item.contentType.replace("_", " ")}
              </p>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>

            <button
              onClick={onToggleScheduler}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                isSchedulerOpen
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {item.scheduledAt ? "Edit" : "Schedule"}
            </button>
          </div>

          {/* Desktop: Inline schedule picker dropdown */}
          <div className="hidden sm:block">
            <AnimatePresence>
              {isSchedulerOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden border-t border-zinc-200 dark:border-zinc-700"
                >
                  <SchedulePicker
                    contentId={item.id}
                    contentType={item.type}
                    currentDate={item.scheduledAt}
                    onClose={onToggleScheduler}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile: Full-screen modal */}
      <AnimatePresence>
        {isSchedulerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="sm:hidden fixed inset-0 z-50 flex items-end justify-center"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggleScheduler}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            {/* Modal content */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-h-[90vh] bg-white dark:bg-zinc-900 rounded-t-3xl overflow-hidden"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Schedule {item.type === "post" ? "Post" : "Article"}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">
                    {item.label}
                  </p>
                </div>
                <button
                  onClick={onToggleScheduler}
                  className="p-2 -mr-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Picker content */}
              <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
                <SchedulePicker
                  contentId={item.id}
                  contentType={item.type}
                  currentDate={item.scheduledAt}
                  onClose={onToggleScheduler}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SchedulePicker({
  contentId,
  contentType,
  currentDate,
  onClose,
}: {
  contentId: string;
  contentType: "post" | "article";
  currentDate?: Date | null;
  onClose: () => void;
}) {
  // Initialize with current date in local time
  const initialDate = currentDate ? new Date(currentDate) : null;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialDate ?? undefined
  );
  const [hour, setHour] = useState<string>(
    initialDate ? String(initialDate.getHours()).padStart(2, "0") : "09"
  );
  const [minute, setMinute] = useState<string>(
    initialDate ? String(initialDate.getMinutes()).padStart(2, "0") : "00"
  );
  const [isSaving, setIsSaving] = useState(false);

  const today = startOfDay(new Date());

  const handleSave = async () => {
    if (!selectedDate) return;

    setIsSaving(true);
    try {
      // Combine date and time in local timezone
      const scheduledLocal = setMinutes(
        setHours(selectedDate, parseInt(hour)),
        parseInt(minute)
      );

      const endpoint = contentType === "post"
        ? `/api/posts/${contentId}/schedule`
        : `/api/articles/${contentId}/schedule`;

      await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: scheduledLocal.toISOString(),
        }),
      });

      onClose();
      window.location.reload();
    } catch {
      // Silent fail - could add toast here
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    try {
      const endpoint = contentType === "post"
        ? `/api/posts/${contentId}/schedule`
        : `/api/articles/${contentId}/schedule`;

      await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: null }),
      });

      onClose();
      window.location.reload();
    } catch {
      // Silent fail
    } finally {
      setIsSaving(false);
    }
  };

  // Quick date presets
  const presets = [
    { label: "Today", date: today },
    { label: "Tomorrow", date: addDays(today, 1) },
    { label: "Next Week", date: addDays(today, 7) },
  ];

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-900/80">
      {/* Quick presets */}
      <div className="flex gap-2 mb-3">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => setSelectedDate(preset.date)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              selectedDate && format(selectedDate, "yyyy-MM-dd") === format(preset.date, "yyyy-MM-dd")
                ? "bg-blue-600 text-white"
                : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Calendar */}
      <div className="flex justify-center mb-3">
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          disabled={(date) => isBefore(date, today)}
          classNames={{
            root: "!font-sans",
            months: "flex flex-col",
            month: "space-y-2",
            caption: "flex justify-center pt-1 relative items-center text-sm font-semibold text-zinc-900 dark:text-zinc-100",
            caption_label: "text-sm font-medium",
            nav: "flex items-center gap-1",
            nav_button: "h-7 w-7 bg-transparent p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md inline-flex items-center justify-center",
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse",
            head_row: "flex",
            head_cell: "text-zinc-500 dark:text-zinc-400 w-8 font-normal text-[0.65rem] uppercase",
            row: "flex w-full mt-1",
            cell: "text-center text-sm relative p-0",
            day: "h-8 w-8 p-0 font-normal text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md inline-flex items-center justify-center transition-colors",
            day_selected: "!bg-blue-600 !text-white hover:!bg-blue-700",
            day_today: "bg-zinc-100 dark:bg-zinc-800 font-semibold",
            day_outside: "text-zinc-400 dark:text-zinc-600 opacity-50",
            day_disabled: "text-zinc-300 dark:text-zinc-700 cursor-not-allowed hover:bg-transparent",
          }}
        />
      </div>

      {/* Time picker */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
          Time
        </label>
        <div className="flex items-center gap-2">
          <select
            value={hour}
            onChange={(e) => setHour(e.target.value)}
            className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={String(i).padStart(2, "0")}>
                {String(i).padStart(2, "0")}
              </option>
            ))}
          </select>
          <span className="text-zinc-400 font-medium">:</span>
          <select
            value={minute}
            onChange={(e) => setMinute(e.target.value)}
            className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {["00", "15", "30", "45"].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">
            {parseInt(hour) >= 12 ? "PM" : "AM"}
          </span>
        </div>
      </div>

      {/* Selected datetime display */}
      {selectedDate && (
        <div className="mb-4 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {format(selectedDate, "EEEE, MMMM d, yyyy")} at {hour}:{minute}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving || !selectedDate}
          className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {isSaving ? "Saving..." : "Save Schedule"}
        </button>
        {currentDate && (
          <button
            onClick={handleClear}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}
