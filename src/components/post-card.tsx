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

  // Get content without the hook to avoid duplication in expanded view
  const getContentWithoutHook = () => {
    const fullText = post.fullText;
    const hook = post.hook;

    // If fullText starts with the hook, remove it
    if (fullText.startsWith(hook)) {
      return fullText.substring(hook.length).trim();
    }

    // Try to remove just the first line if it matches the displayTitle
    const lines = fullText.split("\n");
    const firstLine = lines[0]?.trim();
    if (firstLine && displayTitle.startsWith(firstLine.substring(0, 20))) {
      return lines.slice(1).join("\n").trim();
    }

    return fullText;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.35,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{
        y: -3,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      className="group relative"
    >
      <motion.div
        className="relative rounded-xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
        whileHover={{
          boxShadow: "0 16px 32px -8px rgba(0, 0, 0, 0.1), 0 8px 16px -8px rgba(0, 0, 0, 0.06)",
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Accent top bar */}
        <div className={`h-1 w-full ${post.approved ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-blue-400 to-blue-500"}`} />

        {/* Card header */}
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3
                data-testid="post-card-title"
                className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-snug line-clamp-2"
                title={post.hook}
              >
                {displayTitle}
              </h3>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  v{post.versionNumber ?? 1}
                </span>
                {hasImage && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="sr-only">Image ready</span>
                  </span>
                )}
              </div>
            </div>
            {post.approved && (
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>
        </div>

        {/* Integrated image preview */}
        {hasImage && (
          <div className="px-4 pb-3">
            <div
              className="relative w-full aspect-[1.91/1] rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 cursor-pointer group/img"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Image
                src={post.imageIntent!.generatedImageUrl!}
                alt={post.imageIntent!.headlineText || "Post cover"}
                fill
                className="object-cover transition-transform duration-500 group-hover/img:scale-105"
                sizes="(max-width: 768px) 90vw, 400px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-300" />
            </div>
          </div>
        )}

        {/* Expand button */}
        <div className="px-4 pb-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            <motion.svg
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </motion.svg>
            {isExpanded ? "Less" : "More"}
          </button>
        </div>

        {/* Expandable content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                {/* Full Post Text (without hook to avoid duplication) */}
                <div
                  data-testid="post-expanded-content"
                  className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-p:my-3 prose-p:leading-relaxed text-sm"
                >
                  <ReactMarkdown>
                    {getContentWithoutHook().replace(/\n(?!\n)/g, '\n\n')}
                  </ReactMarkdown>
                </div>

                {/* Image details (collapsible) */}
                {post.imageIntent && (
                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowImageDetails(!showImageDetails);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
                      >
                        <motion.svg
                          animate={{ rotate: showImageDetails ? 90 : 0 }}
                          transition={{ duration: 0.15 }}
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </motion.svg>
                        Prompt
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
                          <div className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-xs font-mono text-zinc-600 dark:text-zinc-400">
                            <p className="truncate" title={post.imageIntent.prompt}>
                              <span className="text-emerald-600 dark:text-emerald-400">+</span> {post.imageIntent.prompt}
                            </p>
                            <p className="truncate mt-1" title={post.imageIntent.negativePrompt}>
                              <span className="text-rose-600 dark:text-rose-400">−</span> {post.imageIntent.negativePrompt}
                            </p>
                          </div>
                          <div className="mt-3">
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

        {/* Action bar - icon-based */}
        <div className="px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between gap-2">
          <ApprovalButtons
            postId={post.id}
            approved={post.approved ?? false}
            intentId={post.imageIntent?.id}
            hasImage={hasImage}
            imageUrl={post.imageIntent?.generatedImageUrl}
          />
          <CopyButton text={post.fullText} />
        </div>
      </motion.div>
    </motion.div>
  );
}
