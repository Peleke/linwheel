"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { CopyButton } from "@/components/copy-button";
import { ApprovalButtons } from "@/components/approval-buttons";
import { GenerateImageButton } from "@/components/generate-image-button";

interface PostWithIntent {
  id: string;
  hook: string;
  fullText: string;
  postType: string;
  versionNumber: number | null;
  approved: boolean | null;
  imageIntent?: {
    id: string;
    headlineText: string;
    prompt: string;
    negativePrompt: string;
    stylePreset: string;
    generatedImageUrl?: string | null;
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
            ? "bg-gradient-to-r from-emerald-500/30 via-green-500/30 to-emerald-500/30"
            : "bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-indigo-500/20"
        }`}
      />

      <div
        className={`relative border rounded-xl overflow-hidden transition-all duration-300 group-hover:scale-[1.02] ${
          post.approved
            ? "border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 via-white to-green-50/50 dark:from-emerald-900/20 dark:via-slate-900 dark:to-green-900/10"
            : "border-indigo-200/70 dark:border-indigo-800/50 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-800/50 dark:to-indigo-950/30"
        }`}
      >
        {/* Gradient slice bar at top - always visible */}
        <div
          className={`h-1 w-full ${
            post.approved
              ? "bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-400"
              : "bg-gradient-to-r from-indigo-400 via-violet-500 to-indigo-400"
          }`}
        />

        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Card header */}
        <div className="relative px-4 py-3 bg-gradient-to-r from-indigo-50/80 via-slate-50/50 to-indigo-50/80 dark:from-indigo-950/40 dark:via-slate-900/50 dark:to-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center">
          <span className="text-sm font-semibold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-violet-600 dark:from-indigo-300 dark:to-violet-400">
            Version {post.versionNumber ?? 1}
          </span>
          {post.approved && (
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

        {/* Hook preview */}
        <div className="relative p-4">
          <p className="text-sm font-medium mb-3 line-clamp-2 text-slate-800 dark:text-slate-200">
            {post.hook}
          </p>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
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
                <div className="mt-3 border-t border-indigo-100 dark:border-indigo-900/50 pt-3 text-slate-600 dark:text-slate-400 prose prose-sm prose-slate dark:prose-invert max-w-none prose-p:my-2 prose-strong:text-slate-700 dark:prose-strong:text-slate-300 prose-headings:text-slate-800 dark:prose-headings:text-slate-200">
                  <ReactMarkdown>{post.fullText}</ReactMarkdown>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Image intent */}
        {post.imageIntent && (
          <div className="px-4 py-3 bg-gradient-to-r from-violet-50/50 via-purple-50/30 to-violet-50/50 dark:from-violet-900/10 dark:via-purple-900/5 dark:to-violet-900/10 border-t border-indigo-100 dark:border-indigo-900/50">
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
                  <div className="mt-2 p-3 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg text-xs font-mono">
                    <p className="text-emerald-400">
                      <span className="text-slate-500">+ </span>
                      {post.imageIntent.prompt}
                    </p>
                    <p className="text-rose-400 mt-1">
                      <span className="text-slate-500">- </span>
                      {post.imageIntent.negativePrompt}
                    </p>
                    <p className="text-violet-400 mt-1">
                      <span className="text-slate-500">style: </span>
                      {post.imageIntent.stylePreset}
                    </p>
                  </div>
                  {/* Generate Image Button */}
                  <div className="mt-3">
                    <GenerateImageButton
                      intentId={post.imageIntent.id}
                      isArticle={false}
                      existingImageUrl={post.imageIntent.generatedImageUrl}
                      headlineText={post.imageIntent.headlineText}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Actions */}
        <div className="relative px-4 py-3 border-t border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center bg-gradient-to-r from-slate-50/50 via-transparent to-slate-50/50 dark:from-slate-800/30 dark:via-transparent dark:to-slate-800/30">
          <ApprovalButtons postId={post.id} approved={post.approved ?? false} />
          <CopyButton text={post.fullText} />
        </div>
      </div>
    </motion.div>
  );
}
