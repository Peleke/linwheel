"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { CopyButton } from "@/components/copy-button";
import { ApprovalButtons } from "@/components/approval-buttons";
import { ImagePreview } from "./image-preview";
import { RegeneratePromptButton } from "./regenerate-prompt-button";

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
  const [showImageDetails, setShowImageDetails] = useState(false);

  // Clean hook for display - first sentence or first 80 chars
  const displayTitle = post.hook.split(/[.!?]/)[0]?.trim() || post.hook.substring(0, 80);
  const hasImage = !!post.imageIntent?.generatedImageUrl;

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
        className={`relative border rounded-xl overflow-hidden transition-all duration-300 group-hover:scale-[1.01] ${
          post.approved
            ? "border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 via-white to-green-50/50 dark:from-emerald-900/20 dark:via-slate-900 dark:to-green-900/10"
            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
        }`}
      >
        {/* Minimal top bar */}
        <div
          className={`h-0.5 w-full ${
            post.approved
              ? "bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-400"
              : "bg-gradient-to-r from-indigo-400 via-violet-500 to-indigo-400"
          }`}
        />

        {/* Card header - title with version badge */}
        <div className="px-4 py-3 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-slate-900 dark:text-white truncate cursor-default"
              title={post.hook}
            >
              {displayTitle}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                v{post.versionNumber ?? 1}
              </span>
              {hasImage && (
                <span className="text-xs text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Image ready
                </span>
              )}
            </div>
          </div>
          {post.approved && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
            >
              Approved
            </motion.span>
          )}
        </div>

        {/* Integrated image preview (when available and expanded or always show thumbnail) */}
        {hasImage && (
          <div className="px-4 pb-2">
            <div
              className="relative aspect-[1.91/1] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer group/img"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Image
                src={post.imageIntent!.generatedImageUrl!}
                alt={post.imageIntent!.headlineText || "Post cover"}
                fill
                className="object-cover transition-transform duration-300 group-hover/img:scale-105"
                sizes="(max-width: 768px) 100vw, 400px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
              <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                <p className="text-white text-xs font-medium drop-shadow-lg truncate">
                  {post.imageIntent!.headlineText}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expandable content */}
        <div className="px-4 pb-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            <motion.span
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-xs"
            >
              ▼
            </motion.span>
            {isExpanded ? "Collapse" : "View full post"}
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
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {/* Full Post Text */}
                  <div className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-p:my-3 prose-p:leading-relaxed">
                    <ReactMarkdown>
                      {post.fullText.replace(/\n(?!\n)/g, '\n\n')}
                    </ReactMarkdown>
                  </div>

                  {/* Image details (collapsible) */}
                  {post.imageIntent && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowImageDetails(!showImageDetails);
                          }}
                          className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 flex items-center gap-1"
                        >
                          <motion.span
                            animate={{ rotate: showImageDetails ? 90 : 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            ›
                          </motion.span>
                          Image prompt details
                        </button>
                        <RegeneratePromptButton
                          id={post.id}
                          isArticle={false}
                          hasIntent={!!post.imageIntent}
                        />
                      </div>

                      <AnimatePresence>
                        {showImageDetails && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded text-xs font-mono text-slate-600 dark:text-slate-400">
                              <p className="truncate" title={post.imageIntent.prompt}>
                                <span className="text-emerald-600 dark:text-emerald-400">+</span> {post.imageIntent.prompt}
                              </p>
                              <p className="truncate mt-1" title={post.imageIntent.negativePrompt}>
                                <span className="text-rose-600 dark:text-rose-400">−</span> {post.imageIntent.negativePrompt}
                              </p>
                            </div>
                            <div className="mt-2">
                              <ImagePreview
                                intentId={post.imageIntent.id}
                                isArticle={false}
                                generatedImageUrl={post.imageIntent.generatedImageUrl}
                                headlineText={post.imageIntent.headlineText}
                                isApproved={post.approved ?? false}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions - cleaner, minimal */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <ApprovalButtons
            postId={post.id}
            approved={post.approved ?? false}
            intentId={post.imageIntent?.id}
            hasImage={hasImage}
            imageUrl={post.imageIntent?.generatedImageUrl}
          />
          <CopyButton text={post.fullText} />
        </div>
      </div>
    </motion.div>
  );
}
