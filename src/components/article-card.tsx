"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { ApprovalButtons } from "./approval-buttons";
import { CopyButton } from "./copy-button";

interface ArticleWithIntent {
  id: string;
  title: string;
  subtitle: string | null;
  introduction: string;
  sections: string[];
  conclusion: string;
  fullText: string;
  articleType: string;
  versionNumber: number | null;
  approved: boolean | null;
  imageIntent?: {
    headlineText: string;
    prompt: string;
    negativePrompt: string;
    stylePreset: string;
  };
}

export function ArticleCard({
  article,
  runId,
}: {
  article: ArticleWithIntent;
  runId: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showImageIntent, setShowImageIntent] = useState(false);

  const wordCount = article.fullText.split(/\s+/).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group relative"
    >
      {/* Glow effect behind card */}
      <div
        className={`absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm ${
          article.approved
            ? "bg-gradient-to-r from-emerald-500/30 via-green-500/30 to-emerald-500/30"
            : "bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-blue-500/20"
        }`}
      />

      <div
        className={`relative border rounded-xl overflow-hidden transition-all duration-300 group-hover:scale-[1.01] ${
          article.approved
            ? "border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 via-white to-green-50/50 dark:from-emerald-900/20 dark:via-slate-900 dark:to-green-900/10"
            : "border-blue-200/70 dark:border-blue-800/50 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 dark:from-blue-900/10 dark:via-slate-900 dark:to-indigo-950/20"
        }`}
      >
        {/* Gradient slice bar at top - always visible */}
        <div
          className={`h-1 w-full ${
            article.approved
              ? "bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-400"
              : "bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-400"
          }`}
        />

        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Card header */}
        <div className="relative px-4 py-3 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-blue-50/80 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/40 border-b border-blue-100/50 dark:border-blue-900/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-lg">📄</span>
            <span className="text-sm font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600 dark:from-blue-300 dark:to-indigo-400">
              Version {article.versionNumber ?? 1}
            </span>
            <span className="text-xs text-blue-500 dark:text-blue-400 font-medium">
              {wordCount} words
            </span>
          </div>
          {article.approved && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-2.5 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25"
            >
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Approved
              </span>
            </motion.span>
          )}
        </div>

        {/* Title and subtitle */}
        <div className="relative p-4">
          <h3 className="font-bold text-lg mb-1 text-slate-900 dark:text-white">
            {article.title}
          </h3>
          {article.subtitle && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 italic">
              {article.subtitle}
            </p>
          )}

          {/* Article preview button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center gap-2 font-medium"
          >
            <motion.span
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▼
            </motion.span>
            {isExpanded ? "Hide article" : "Read full article"}
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="mt-4 border-t border-indigo-100 dark:border-indigo-900/50 pt-4 space-y-6">
                  {/* Introduction */}
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-indigo-500 to-blue-500 rounded-full" />
                    <div className="pl-4">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <span className="text-blue-500">Introduction</span>
                      </h4>
                      <div className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-p:my-2 prose-p:text-slate-700 dark:prose-p:text-slate-300">
                        <ReactMarkdown>{article.introduction}</ReactMarkdown>
                      </div>
                    </div>
                  </div>

                  {/* Sections */}
                  {article.sections.map((section, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="relative"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-violet-400 rounded-full opacity-50" />
                      <div className="pl-4 prose prose-sm prose-slate dark:prose-invert max-w-none prose-p:my-2 prose-p:text-slate-700 dark:prose-p:text-slate-300">
                        <ReactMarkdown>{section}</ReactMarkdown>
                      </div>
                    </motion.div>
                  ))}

                  {/* Conclusion */}
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 via-green-500 to-emerald-500 rounded-full" />
                    <div className="pl-4">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <span className="text-emerald-500">Conclusion</span>
                      </h4>
                      <div className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-p:my-2 prose-p:text-slate-700 dark:prose-p:text-slate-300">
                        <ReactMarkdown>{article.conclusion}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Image intent */}
        {article.imageIntent && (
          <div className="px-4 py-3 bg-gradient-to-r from-violet-50/50 via-purple-50/30 to-violet-50/50 dark:from-violet-900/10 dark:via-purple-900/5 dark:to-violet-900/10 border-t border-indigo-100 dark:border-indigo-900/50">
            <button
              onClick={() => setShowImageIntent(!showImageIntent)}
              className="w-full text-left text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors flex items-center gap-2"
            >
              <span className="text-lg">🖼️</span>
              <span className="truncate">
                Cover Image: &ldquo;{article.imageIntent.headlineText}&rdquo;
              </span>
              <motion.span
                animate={{ rotate: showImageIntent ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-auto"
              >
                ▼
              </motion.span>
            </button>

            <AnimatePresence>
              {showImageIntent && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 p-3 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg text-xs font-mono">
                    <p className="text-emerald-400">
                      <span className="text-slate-500">+ </span>
                      {article.imageIntent.prompt}
                    </p>
                    <p className="text-rose-400 mt-1">
                      <span className="text-slate-500">- </span>
                      {article.imageIntent.negativePrompt}
                    </p>
                    <p className="text-violet-400 mt-1">
                      <span className="text-slate-500">style: </span>
                      {article.imageIntent.stylePreset}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Actions */}
        <div className="relative px-4 py-3 border-t border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center bg-gradient-to-r from-slate-50/50 via-transparent to-slate-50/50 dark:from-slate-800/30 dark:via-transparent dark:to-slate-800/30">
          <ApprovalButtons
            postId={article.id}
            approved={article.approved ?? false}
            isArticle
          />
          <CopyButton text={article.fullText} />
        </div>
      </div>
    </motion.div>
  );
}
