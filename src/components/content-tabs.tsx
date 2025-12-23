"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ContentTabsProps {
  postCount: number;
  articleCount: number;
  postsContent: ReactNode;
  articlesContent: ReactNode;
}

export function ContentTabs({
  postCount,
  articleCount,
  postsContent,
  articlesContent,
}: ContentTabsProps) {
  const [activeTab, setActiveTab] = useState<"posts" | "articles">(
    postCount > 0 ? "posts" : "articles"
  );

  // If only one type of content, don't show tabs
  if (postCount === 0 && articleCount > 0) {
    return <>{articlesContent}</>;
  }
  if (articleCount === 0 && postCount > 0) {
    return <>{postsContent}</>;
  }
  if (postCount === 0 && articleCount === 0) {
    return null;
  }

  return (
    <div>
      {/* Tab headers with animated indicator */}
      <div className="relative mb-6">
        <div className="flex gap-2 p-1.5 bg-gradient-to-r from-neutral-100 via-neutral-50 to-neutral-100 dark:from-neutral-800 dark:via-neutral-900 dark:to-neutral-800 rounded-xl w-fit border border-neutral-200/50 dark:border-neutral-700/50">
          {/* Sliding background indicator */}
          <motion.div
            className="absolute top-1.5 bottom-1.5 rounded-lg bg-gradient-to-r from-white via-white to-white dark:from-neutral-700 dark:via-neutral-700 dark:to-neutral-700 shadow-md"
            layoutId="activeTabBg"
            initial={false}
            animate={{
              left: activeTab === "posts" ? 6 : "calc(50% + 2px)",
              width: "calc(50% - 8px)",
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />

          <button
            onClick={() => setActiveTab("posts")}
            className={`relative z-10 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "posts"
                ? "text-neutral-900 dark:text-white"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            <span className="text-lg">📝</span>
            <span>Posts</span>
            <motion.span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === "posts"
                  ? "bg-gradient-to-r from-neutral-800 to-neutral-900 text-white dark:from-neutral-100 dark:to-white dark:text-neutral-900"
                  : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400"
              }`}
            >
              {postCount}
            </motion.span>
          </button>

          <button
            onClick={() => setActiveTab("articles")}
            className={`relative z-10 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "articles"
                ? "text-neutral-900 dark:text-white"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            <span className="text-lg">📄</span>
            <span>Articles</span>
            <motion.span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === "articles"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                  : "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
              }`}
            >
              {articleCount}
            </motion.span>
          </button>
        </div>
      </div>

      {/* Tab content with fade animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "posts" ? postsContent : articlesContent}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
