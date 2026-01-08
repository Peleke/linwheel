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
      className="group relative min-w-0"
    >
      <motion.div
        className="relative rounded-xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
        whileHover={{
          boxShadow: "0 16px 32px -8px rgba(0, 0, 0, 0.1), 0 8px 16px -8px rgba(0, 0, 0, 0.06)",
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Accent top bar - sky for articles */}
        <div className={`h-1 w-full ${article.approved ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-sky-400 to-sky-500"}`} />

        {/* Card header */}
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
                <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  v{article.versionNumber ?? 1}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {wordCount}
                </span>
                {hasImage && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="sr-only">Cover ready</span>
                  </span>
                )}
              </div>
            </div>
            {article.approved && (
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
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
                className="object-cover transition-transform duration-500 group-hover/img:scale-105"
                sizes="(max-width: 768px) 90vw, 600px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-300" />
            </div>
          </div>
        )}

        {/* Expand button */}
        <div className="px-5 pb-4">
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
            {isExpanded ? "Less" : "Read"}
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
                          <div
                            data-testid="prompt-text"
                            className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-xs font-mono text-zinc-600 dark:text-zinc-400 overflow-hidden"
                          >
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

        {/* Action bar - icon-based */}
        <div className="px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between gap-2">
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
      </motion.div>
    </motion.div>
  );
}
