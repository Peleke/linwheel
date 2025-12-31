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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group relative"
    >
      {/* Glow effect */}
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
            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
        }`}
      >
        {/* Minimal top bar */}
        <div
          className={`h-0.5 w-full ${
            article.approved
              ? "bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-400"
              : "bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-400"
          }`}
        />

        {/* Card header - title prominent */}
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                {article.title}
              </h3>
              {article.subtitle && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                  {article.subtitle}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  v{article.versionNumber ?? 1}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {wordCount} words
                </span>
                {hasImage && (
                  <span className="text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Cover ready
                  </span>
                )}
              </div>
            </div>
            {article.approved && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
              >
                Approved
              </motion.span>
            )}
          </div>
        </div>

        {/* Integrated cover image (always visible when available) */}
        {hasImage && (
          <div className="px-4 pb-3">
            <div
              className="relative aspect-[1.91/1] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer group/img"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Image
                src={article.imageIntent!.generatedImageUrl!}
                alt={article.imageIntent!.headlineText || "Article cover"}
                fill
                className="object-cover transition-transform duration-300 group-hover/img:scale-105"
                sizes="(max-width: 768px) 100vw, 600px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white text-sm font-medium drop-shadow-lg line-clamp-2">
                  {article.imageIntent!.headlineText}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expand button */}
        <div className="px-4 pb-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
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
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-5 border-t border-slate-100 dark:border-slate-800 pt-4">
                {/* Introduction */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">
                    Introduction
                  </h4>
                  <div className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed">
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
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                          {heading}
                        </h4>
                      )}
                      <div className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-headings:font-semibold">
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
                  <div className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed">
                    <ReactMarkdown>{fixMarkdown(article.conclusion)}</ReactMarkdown>
                  </div>
                </div>

                {/* Image details (tucked away) */}
                {article.imageIntent && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
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
                          <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded text-xs font-mono text-slate-600 dark:text-slate-400">
                            <p className="break-words">
                              <span className="text-emerald-600 dark:text-emerald-400">+</span> {article.imageIntent.prompt}
                            </p>
                            <p className="break-words mt-1">
                              <span className="text-rose-600 dark:text-rose-400">−</span> {article.imageIntent.negativePrompt}
                            </p>
                          </div>
                          <div className="mt-2">
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
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
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
