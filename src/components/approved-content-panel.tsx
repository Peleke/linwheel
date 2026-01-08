"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { CopyButton } from "./copy-button";

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
  runId,
}: ApprovedContentPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const totalApproved = posts.length + articles.length;

  if (totalApproved === 0) return null;

  return (
    <div className="mb-8 rounded-2xl overflow-hidden bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm shadow-emerald-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-left">
            <h2 className="font-semibold text-emerald-900 dark:text-emerald-100">
              Approved Content
            </h2>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              {posts.length > 0 && `${posts.length} post${posts.length !== 1 ? "s" : ""}`}
              {posts.length > 0 && articles.length > 0 && " • "}
              {articles.length > 0 && `${articles.length} article${articles.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            onClick={(e) => e.stopPropagation()}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/30 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            View Dashboard
          </Link>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-emerald-500"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </div>
      </button>

      {/* Content Grid */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              {/* Posts */}
              {posts.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-3">
                    Posts
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {posts.map((post) => (
                      <ApprovedPostCard key={post.id} post={post} runId={runId} />
                    ))}
                  </div>
                </div>
              )}

              {/* Articles */}
              {articles.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-3">
                    Articles
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {articles.map((article) => (
                      <ApprovedArticleCard key={article.id} article={article} runId={runId} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ApprovedPostCard({ post, runId }: { post: ApprovedPost; runId: string }) {
  const [showScheduler, setShowScheduler] = useState(false);

  return (
    <div className="group relative bg-white dark:bg-zinc-900 rounded-xl border border-emerald-200 dark:border-emerald-800/50 shadow-sm overflow-hidden">
      {/* Green accent bar for approved state */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />

      <div className="p-3 pl-4">
        {/* Image preview if available */}
        {post.imageUrl && (
          <div className="relative w-full aspect-[1.91/1] rounded-lg overflow-hidden mb-2">
            <Image
              src={post.imageUrl}
              alt={post.hook}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
        )}

        {/* Content */}
        <div className="min-h-[60px]">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">
            {post.hook}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 capitalize">
            {post.postType.replace("_", " ")}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <CopyButton text={post.fullText} variant="compact" />
          <button
            onClick={() => setShowScheduler(!showScheduler)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {post.scheduledAt ? formatScheduleDate(post.scheduledAt) : "Schedule"}
          </button>
        </div>

        {/* Simple date picker (Phase 1) */}
        <AnimatePresence>
          {showScheduler && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <SchedulePicker
                contentId={post.id}
                contentType="post"
                currentDate={post.scheduledAt}
                onClose={() => setShowScheduler(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ApprovedArticleCard({ article, runId }: { article: ApprovedArticle; runId: string }) {
  const [showScheduler, setShowScheduler] = useState(false);

  return (
    <div className="group relative bg-white dark:bg-zinc-900 rounded-xl border border-emerald-200 dark:border-emerald-800/50 shadow-sm overflow-hidden">
      {/* Green accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />

      <div className="p-3 pl-4">
        {/* Image preview */}
        {article.imageUrl && (
          <div className="relative w-full aspect-[1.91/1] rounded-lg overflow-hidden mb-2">
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        )}

        {/* Content */}
        <div className="min-h-[60px]">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">
            {article.title}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 capitalize">
            {article.articleType.replace("_", " ")}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <CopyButton text={article.fullText} variant="compact" />
          <button
            onClick={() => setShowScheduler(!showScheduler)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {article.scheduledAt ? formatScheduleDate(article.scheduledAt) : "Schedule"}
          </button>
        </div>

        {/* Schedule picker */}
        <AnimatePresence>
          {showScheduler && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <SchedulePicker
                contentId={article.id}
                contentType="article"
                currentDate={article.scheduledAt}
                onClose={() => setShowScheduler(false)}
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
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const endpoint = contentType === "post"
        ? `/api/posts/${contentId}/schedule`
        : `/api/articles/${contentId}/schedule`;

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: date ? new Date(date).toISOString() : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      onClose();
      // Trigger page refresh to show updated schedule
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schedule");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setDate("");
    await handleSave();
  };

  return (
    <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
      <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
        Schedule for
      </label>
      <input
        type="datetime-local"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        min={new Date().toISOString().slice(0, 16)}
        className="w-full px-2 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
      />

      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}

      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 px-2 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded transition-colors"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
        {currentDate && (
          <button
            onClick={handleClear}
            disabled={isSaving}
            className="px-2 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
          >
            Clear
          </button>
        )}
        <button
          onClick={onClose}
          className="px-2 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function formatScheduleDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}
