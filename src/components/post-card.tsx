"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CopyButton } from "@/components/copy-button";
import { ApprovalButtons } from "@/components/approval-buttons";

interface PostWithIntent {
  id: string;
  hook: string;
  fullText: string;
  postType: string;
  versionNumber: number | null;
  approved: boolean | null;
  imageIntent?: {
    headlineText: string;
    prompt: string;
    negativePrompt: string;
    stylePreset: string;
  };
}

interface PostCardProps {
  post: PostWithIntent;
  runId: string;
}

export function PostCard({ post, runId }: PostCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showImageIntent, setShowImageIntent] = useState(false);

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
          post.approved
            ? "bg-gradient-to-r from-green-500/30 via-emerald-500/30 to-green-500/30"
            : "bg-gradient-to-r from-neutral-400/20 via-neutral-300/20 to-neutral-400/20"
        }`}
      />

      <div
        className={`relative border rounded-xl overflow-hidden transition-all duration-300 group-hover:scale-[1.02] ${
          post.approved
            ? "border-green-300 dark:border-green-700 bg-gradient-to-br from-green-50 via-white to-emerald-50/50 dark:from-green-900/20 dark:via-neutral-900 dark:to-emerald-900/10"
            : "border-neutral-200 dark:border-neutral-700 bg-gradient-to-br from-white via-neutral-50/50 to-neutral-100/30 dark:from-neutral-900 dark:via-neutral-800/50 dark:to-neutral-900"
        }`}
      >
        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Top accent line */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
            post.approved
              ? "bg-gradient-to-r from-green-400/50 via-emerald-500 to-green-400/50"
              : "bg-gradient-to-r from-neutral-300/50 via-neutral-400 to-neutral-300/50 dark:from-neutral-600/50 dark:via-neutral-500 dark:to-neutral-600/50"
          }`}
        />

        {/* Card header */}
        <div className="relative px-4 py-3 bg-gradient-to-r from-neutral-100/80 via-neutral-50/50 to-neutral-100/80 dark:from-neutral-800/80 dark:via-neutral-900/50 dark:to-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
          <span className="text-sm font-semibold bg-clip-text text-transparent bg-gradient-to-r from-neutral-700 to-neutral-500 dark:from-neutral-200 dark:to-neutral-400">
            Version {post.versionNumber ?? 1}
          </span>
          {post.approved && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-2.5 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25"
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

        {/* Hook preview */}
        <div className="relative p-4">
          <p className="text-sm font-medium mb-3 line-clamp-2 text-neutral-800 dark:text-neutral-200">
            {post.hook}
          </p>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors flex items-center gap-1"
          >
            <motion.span
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▼
            </motion.span>
            {isExpanded ? "Hide full post" : "View full post"}
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
                <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed border-t border-neutral-200 dark:border-neutral-700 pt-3 text-neutral-600 dark:text-neutral-400">
                  {post.fullText}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Image intent */}
        {post.imageIntent && (
          <div className="px-4 py-3 bg-gradient-to-r from-violet-50/50 via-purple-50/30 to-violet-50/50 dark:from-violet-900/10 dark:via-purple-900/5 dark:to-violet-900/10 border-t border-neutral-200 dark:border-neutral-700">
            <button
              onClick={() => setShowImageIntent(!showImageIntent)}
              className="w-full text-left text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors flex items-center gap-2"
            >
              <span className="text-lg">🎨</span>
              <span className="truncate">
                Image: &ldquo;{post.imageIntent.headlineText}&rdquo;
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
                  <div className="mt-2 p-3 bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-lg text-xs font-mono">
                    <p className="text-green-400">
                      <span className="text-neutral-500">+ </span>
                      {post.imageIntent.prompt}
                    </p>
                    <p className="text-red-400 mt-1">
                      <span className="text-neutral-500">- </span>
                      {post.imageIntent.negativePrompt}
                    </p>
                    <p className="text-violet-400 mt-1">
                      <span className="text-neutral-500">style: </span>
                      {post.imageIntent.stylePreset}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Actions */}
        <div className="relative px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 flex justify-between items-center bg-gradient-to-r from-neutral-50/50 via-transparent to-neutral-50/50 dark:from-neutral-800/30 dark:via-transparent dark:to-neutral-800/30">
          <ApprovalButtons postId={post.id} approved={post.approved ?? false} />
          <CopyButton text={post.fullText} />
        </div>
      </div>
    </motion.div>
  );
}
