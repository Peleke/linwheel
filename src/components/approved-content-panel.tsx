"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

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

  if (totalApproved === 0) return null;

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

        {/* Schedule picker dropdown */}
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
  const [date, setDate] = useState<string>(
    currentDate ? new Date(currentDate).toISOString().slice(0, 16) : ""
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const endpoint = contentType === "post"
        ? `/api/posts/${contentId}/schedule`
        : `/api/articles/${contentId}/schedule`;

      await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: date ? new Date(date).toISOString() : null,
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

  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50">
      <input
        type="datetime-local"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        min={new Date().toISOString().slice(0, 16)}
        className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {isSaving ? "..." : "Save"}
        </button>
        {currentDate && (
          <button
            onClick={() => { setDate(""); handleSave(); }}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
