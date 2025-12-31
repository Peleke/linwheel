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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group relative min-w-0 overflow-hidden"
    >
      <div
        className={`relative rounded-xl overflow-hidden transition-all duration-200 ${
          post.approved
            ? "bg-white dark:bg-zinc-900 border-l-2 border-l-emerald-500 border border-zinc-200 dark:border-zinc-800 border-l-emerald-500"
            : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
        } hover:shadow-md dark:hover:shadow-zinc-900/50`}
      >

        {/* Card header - title with version badge */}
        <div className="px-5 py-4 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-zinc-900 dark:text-zinc-100 truncate cursor-default"
              title={post.hook}
            >
              {displayTitle}
            </h3>
            <div className="flex items-center gap-2.5 mt-1.5">
              <span className="text-xs text-zinc-500 dark:text-zinc-500">
                v{post.versionNumber ?? 1}
              </span>
              {hasImage && (
                <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Image ready
                </span>
              )}
            </div>
          </div>
          {post.approved && (
            <span className="shrink-0 px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              Approved
            </span>
          )}
        </div>

        {/* Integrated image preview */}
        {hasImage && (
          <div className="px-5 pb-3 overflow-hidden">
            <div
              className="relative w-full aspect-[1.91/1] rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 cursor-pointer group/img"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Image
                src={post.imageIntent!.generatedImageUrl!}
                alt={post.imageIntent!.headlineText || "Post cover"}
                fill
                className="object-cover transition-transform duration-300 group-hover/img:scale-[1.02]"
                sizes="(max-width: 768px) 90vw, 400px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
              <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                <p className="text-white text-xs font-medium drop-shadow-lg truncate">
                  {post.imageIntent!.headlineText}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expandable content */}
        <div className="px-5 pb-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center gap-1.5"
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
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  {/* Full Post Text */}
                  <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-p:my-3 prose-p:leading-relaxed">
                    <ReactMarkdown>
                      {post.fullText.replace(/\n(?!\n)/g, '\n\n')}
                    </ReactMarkdown>
                  </div>

                  {/* Image details (collapsible) */}
                  {post.imageIntent && (
                    <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowImageDetails(!showImageDetails);
                          }}
                          className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 flex items-center gap-1"
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
        </div>

        {/* Actions */}
        <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
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
