"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { ApprovalButtons } from "./approval-buttons";
import { CopyButton } from "./copy-button";
import { ImagePreview } from "./image-preview";
import { CarouselButton } from "./carousel-button";
import { RegeneratePromptButton } from "./regenerate-prompt-button";

/**
 * Fix markdown formatting issues in sections
 */
function fixMarkdown(text: string): string {
  if (!text) return "";

  // Normalize line breaks - remove any single \n that might cause display issues
  let fixed = text.replace(/\r\n/g, '\n');

  // Ensure headers have proper spacing
  fixed = fixed.replace(/^(#{1,6}\s+[^\n]+)\n(?!\n)/gm, "$1\n\n");

  // Clean up any whitespace around headers
  fixed = fixed.replace(/\n{3,}/g, '\n\n');

  return fixed.trim();
}

/**
 * Extract clean heading from section (removes ## prefix and extra whitespace)
 */
function extractHeading(section: string): string | null {
  const match = section.match(/^#{1,6}\s+(.+)$/m);
  if (match) {
    return match[1].trim();
  }
  return null;
}

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
    id: string;
    headlineText: string;
    prompt: string;
    negativePrompt: string;
    stylePreset: string;
    generatedImageUrl?: string | null;
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
  const [showImageDetails, setShowImageDetails] = useState(false);

  const wordCount = article.fullText.split(/\s+/).length;
  const hasImage = !!article.imageIntent?.generatedImageUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group relative min-w-0 overflow-hidden"
    >
      <div
        className={`relative rounded-xl overflow-hidden transition-all duration-200 ${
          article.approved
            ? "bg-white dark:bg-zinc-900 border-l-2 border-l-emerald-500 border border-zinc-200 dark:border-zinc-800 border-l-emerald-500"
            : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
        } hover:shadow-md dark:hover:shadow-zinc-900/50`}
      >

        {/* Card header - title prominent */}
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 leading-tight">
                {article.title}
              </h3>
              {article.subtitle && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">
                  {article.subtitle}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-500">
                  v{article.versionNumber ?? 1}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-500">
                  {wordCount} words
                </span>
                {hasImage && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Cover ready
                  </span>
                )}
              </div>
            </div>
            {article.approved && (
              <span className="shrink-0 px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                Approved
              </span>
            )}
          </div>
        </div>

        {/* Integrated cover image */}
        {hasImage && (
          <div className="px-5 pb-3 overflow-hidden">
            <div
              className="relative w-full aspect-[1.91/1] rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 cursor-pointer group/img"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Image
                src={article.imageIntent!.generatedImageUrl!}
                alt={article.imageIntent!.headlineText || "Article cover"}
                fill
                className="object-cover transition-transform duration-300 group-hover/img:scale-[1.02]"
                sizes="(max-width: 768px) 90vw, 600px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white text-sm font-medium drop-shadow-lg line-clamp-2">
                  {article.imageIntent!.headlineText}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expand button */}
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
            {isExpanded ? "Collapse" : "Read full article"}
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
              <div className="px-5 pb-5 space-y-6 border-t border-zinc-100 dark:border-zinc-800 pt-5">
                {/* Introduction */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">
                    Introduction
                  </h4>
                  <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed">
                    <ReactMarkdown>{fixMarkdown(article.introduction)}</ReactMarkdown>
                  </div>
                </div>

                {/* Sections */}
                {article.sections.map((section, i) => {
                  const heading = extractHeading(section);
                  const content = heading
                    ? section.replace(/^#{1,6}\s+.+$/m, "").trim()
                    : section;

                  return (
                    <div key={i}>
                      {heading && (
                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                          {heading}
                        </h4>
                      )}
                      <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-headings:font-semibold">
                        <ReactMarkdown>{fixMarkdown(content)}</ReactMarkdown>
                      </div>
                    </div>
                  );
                })}

                {/* Conclusion */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                    Conclusion
                  </h4>
                  <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed">
                    <ReactMarkdown>{fixMarkdown(article.conclusion)}</ReactMarkdown>
                  </div>
                </div>

                {/* Image details (tucked away) */}
                {article.imageIntent && (
                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
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
                        Cover image prompt
                      </button>
                      <RegeneratePromptButton
                        id={article.id}
                        isArticle={true}
                        hasIntent={!!article.imageIntent}
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
                            <p className="break-words">
                              <span className="text-emerald-600 dark:text-emerald-400">+</span> {article.imageIntent.prompt}
                            </p>
                            <p className="break-words mt-1">
                              <span className="text-rose-600 dark:text-rose-400">−</span> {article.imageIntent.negativePrompt}
                            </p>
                          </div>
                          <div className="mt-3">
                            <ImagePreview
                              intentId={article.imageIntent.id}
                              isArticle={true}
                              generatedImageUrl={article.imageIntent.generatedImageUrl}
                              headlineText={article.imageIntent.headlineText}
                              isApproved={article.approved ?? false}
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

        {/* Carousel button */}
        <CarouselButton
          articleId={article.id}
          isApproved={article.approved ?? false}
        />

        {/* Actions */}
        <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
          <ApprovalButtons
            postId={article.id}
            approved={article.approved ?? false}
            isArticle
            intentId={article.imageIntent?.id}
            hasImage={hasImage}
            imageUrl={article.imageIntent?.generatedImageUrl}
          />
          <CopyButton text={article.fullText} />
        </div>
      </div>
    </motion.div>
  );
}
