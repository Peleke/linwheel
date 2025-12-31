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
      <div className="mb-8">
        <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
          <button
            onClick={() => setActiveTab("posts")}
            className="relative px-5 py-2.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
          >
            {activeTab === "posts" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-white dark:bg-zinc-700 rounded-md shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <span className={activeTab === "posts" ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400"}>
                Posts
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "posts"
                    ? "bg-blue-500 text-white"
                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {postCount}
              </span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab("articles")}
            className="relative px-5 py-2.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
          >
            {activeTab === "articles" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-white dark:bg-zinc-700 rounded-md shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <span className={activeTab === "articles" ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400"}>
                Articles
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "articles"
                    ? "bg-blue-500 text-white"
                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {articleCount}
              </span>
            </span>
          </button>
        </div>
      </div>

      {/* Tab content with fade animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "posts" ? postsContent : articlesContent}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
