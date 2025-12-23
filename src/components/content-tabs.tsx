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
      <div className="mb-6">
        <div className="inline-flex p-1.5 bg-gradient-to-r from-indigo-100/80 via-slate-100/80 to-indigo-100/80 dark:from-indigo-950/50 dark:via-slate-900/80 dark:to-indigo-950/50 rounded-xl border border-indigo-200/50 dark:border-indigo-800/30">
          <button
            onClick={() => setActiveTab("posts")}
            className="relative px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
          >
            {activeTab === "posts" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-white dark:bg-indigo-900/80 rounded-lg shadow-md"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <span className="text-lg">📝</span>
              <span className={activeTab === "posts" ? "text-indigo-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}>
                Posts
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${
                  activeTab === "posts"
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                {postCount}
              </span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab("articles")}
            className="relative px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
          >
            {activeTab === "articles" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-white dark:bg-indigo-900/80 rounded-lg shadow-md"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <span className="text-lg">📄</span>
              <span className={activeTab === "articles" ? "text-indigo-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}>
                Articles
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${
                  activeTab === "articles"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                    : "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
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
