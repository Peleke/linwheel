"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AppHeader } from "@/components/app-header";
import { getStoredLLMPreferences } from "@/hooks/use-llm-preferences";

// Post angle configuration
const POST_ANGLES = [
  { id: "contrarian", label: "Contrarian", description: "Challenges widely-held beliefs", emoji: "🔥" },
  { id: "field_note", label: "Field Note", description: "Observations from real work", emoji: "📝" },
  { id: "demystification", label: "Demystification", description: "Strips glamour from sacred cows", emoji: "💡" },
  { id: "identity_validation", label: "Identity Validation", description: "Makes outliers feel seen", emoji: "🎯" },
  { id: "provocateur", label: "Provocateur", description: "Stirs debate with edgy takes", emoji: "⚡" },
  { id: "synthesizer", label: "Synthesizer", description: "Connects dots across domains", emoji: "🧩" },
  { id: "curious_cat", label: "Curious Cat", description: "Asks probing questions without answering", emoji: "🐱" },
] as const;

// Article angle configuration
const ARTICLE_ANGLES = [
  { id: "deep_dive", label: "Deep Dive", description: "Comprehensive exploration with nuance", emoji: "🌊" },
  { id: "contrarian", label: "Contrarian", description: "Extended argument challenging convention", emoji: "🔥" },
  { id: "how_to", label: "How To", description: "Practical actionable guide", emoji: "📋" },
  { id: "case_study", label: "Case Study", description: "Story-driven analysis with lessons", emoji: "📊" },
] as const;

type PostAngleId = typeof POST_ANGLES[number]["id"];
type ArticleAngleId = typeof ARTICLE_ANGLES[number]["id"];

export default function GeneratePage() {
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [selectedAngles, setSelectedAngles] = useState<PostAngleId[]>(
    POST_ANGLES.map(a => a.id) // All selected by default
  );
  const [selectedArticleAngles, setSelectedArticleAngles] = useState<ArticleAngleId[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Collapsible state
  const [postsExpanded, setPostsExpanded] = useState(true);
  const [articlesExpanded, setArticlesExpanded] = useState(true);

  // Post angle toggles
  const toggleAngle = (angleId: PostAngleId) => {
    setSelectedAngles(prev =>
      prev.includes(angleId)
        ? prev.filter(a => a !== angleId)
        : [...prev, angleId]
    );
  };

  const selectAllAngles = () => {
    setSelectedAngles(POST_ANGLES.map(a => a.id));
  };

  const clearAllAngles = () => {
    setSelectedAngles([]);
  };

  // Article angle toggles
  const toggleArticleAngle = (angleId: ArticleAngleId) => {
    setSelectedArticleAngles(prev =>
      prev.includes(angleId)
        ? prev.filter(a => a !== angleId)
        : [...prev, angleId]
    );
  };

  const selectAllArticleAngles = () => {
    setSelectedArticleAngles(ARTICLE_ANGLES.map(a => a.id));
  };

  const clearAllArticleAngles = () => {
    setSelectedArticleAngles([]);
  };

  // Calculate expected counts
  const expectedPosts = selectedAngles.length * 2 * 3; // angles × versions × insights
  const expectedArticles = selectedArticleAngles.length * 1 * 3; // angles × versions × insights

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Get LLM preferences from localStorage
      const llmPrefs = getStoredLLMPreferences();

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          sourceLabel: sourceLabel || "Untitled",
          selectedAngles,
          selectedArticleAngles,
          llmProvider: llmPrefs.provider,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await response.json();
      // Redirect immediately - dashboard will show progress
      router.push(`/results/${data.runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  // Check if any content is selected
  const hasContentSelected = selectedAngles.length > 0 || selectedArticleAngles.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl font-bold mb-3 text-zinc-900 dark:text-zinc-100">
              Generate content
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mb-10">
              Paste your podcast transcript below. We&apos;ll extract insights and generate
              posts and articles across multiple angles
              {expectedPosts > 0 && <span className="text-zinc-900 dark:text-zinc-100 font-medium"> (up to {expectedPosts} posts)</span>}
              {expectedArticles > 0 && <span className="text-blue-600 dark:text-blue-400 font-medium">{expectedPosts > 0 ? " + " : " (up to "}{expectedArticles} articles{expectedPosts === 0 && ")"}</span>}
              .
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Source Label Input */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-2xl bg-white dark:bg-zinc-900 shadow-sm overflow-hidden"
            >
              <div className="h-1 w-full bg-gradient-to-r from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600" />
              <div className="p-5">
                <label htmlFor="sourceLabel" className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                  Source label <span className="font-normal text-zinc-500">(optional)</span>
                </label>
                <input
                  id="sourceLabel"
                  type="text"
                  value={sourceLabel}
                  onChange={(e) => setSourceLabel(e.target.value)}
                  placeholder="e.g., AI Daily Brief - Dec 22"
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                />
              </div>
            </motion.div>

            {/* Post angle selection - Collapsible Panel */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-sm"
            >
              {/* Accent ribbon */}
              <div className="h-1 w-full bg-gradient-to-r from-blue-400 to-blue-500" />

              {/* Header - Clickable to expand/collapse */}
              <button
                type="button"
                onClick={() => setPostsExpanded(!postsExpanded)}
                className="w-full px-5 py-4 flex justify-between items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <span className="text-lg">📝</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      LinkedIn Posts
                      {selectedAngles.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
                          {selectedAngles.length} selected
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Short-form content for your feed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2 text-xs" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={selectAllAngles}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-500/30 disabled:opacity-50 transition-colors font-medium"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={clearAllAngles}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <motion.div
                    animate={{ rotate: postsExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.div>
                </div>
              </button>

              {/* Collapsible Content */}
              <AnimatePresence initial={false}>
                {postsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-2">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {POST_ANGLES.map((angle, i) => (
                          <motion.label
                            key={angle.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15, delay: i * 0.02 }}
                            className={`group/card relative flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all duration-150 ${
                              selectedAngles.includes(angle.id)
                                ? "bg-blue-50 dark:bg-blue-500/10 shadow-sm shadow-blue-500/10"
                                : "bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedAngles.includes(angle.id)}
                              onChange={() => toggleAngle(angle.id)}
                              disabled={isSubmitting}
                              className="sr-only"
                            />

                            <div className={`shrink-0 w-5 h-5 mt-0.5 rounded-md flex items-center justify-center transition-all ${
                              selectedAngles.includes(angle.id)
                                ? "bg-blue-500 shadow-sm shadow-blue-500/30"
                                : "bg-zinc-200 dark:bg-zinc-700 group-hover/card:bg-blue-200 dark:group-hover/card:bg-blue-900/50"
                            }`}>
                              {selectedAngles.includes(angle.id) && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-base">{angle.emoji}</span>
                                <span className={`text-sm font-medium transition-colors ${
                                  selectedAngles.includes(angle.id)
                                    ? "text-blue-900 dark:text-blue-100"
                                    : "text-zinc-700 dark:text-zinc-300"
                                }`}>
                                  {angle.label}
                                </span>
                              </div>
                              <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-0.5">
                                {angle.description}
                              </span>
                            </div>
                          </motion.label>
                        ))}
                      </div>
                      <p className="text-xs text-zinc-500 mt-4">
                        Each angle generates 2 versions per insight
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Article angle selection - Collapsible Panel */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-sm"
            >
              {/* Accent ribbon */}
              <div className="h-1 w-full bg-gradient-to-r from-sky-400 to-sky-500" />

              {/* Header - Clickable to expand/collapse */}
              <button
                type="button"
                onClick={() => setArticlesExpanded(!articlesExpanded)}
                className="w-full px-5 py-4 flex justify-between items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
                    <span className="text-lg">📄</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      LinkedIn Articles
                      {selectedArticleAngles.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-lg bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300">
                          {selectedArticleAngles.length} selected
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Long-form content (500-750 words)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2 text-xs" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={selectAllArticleAngles}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 rounded-lg bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-500/30 disabled:opacity-50 transition-colors font-medium"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={clearAllArticleAngles}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <motion.div
                    animate={{ rotate: articlesExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.div>
                </div>
              </button>

              {/* Collapsible Content */}
              <AnimatePresence initial={false}>
                {articlesExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        {ARTICLE_ANGLES.map((angle, i) => (
                          <motion.label
                            key={angle.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15, delay: i * 0.03 }}
                            className={`group/card relative flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all duration-150 ${
                              selectedArticleAngles.includes(angle.id)
                                ? "bg-sky-50 dark:bg-sky-500/10 shadow-sm shadow-sky-500/10"
                                : "bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedArticleAngles.includes(angle.id)}
                              onChange={() => toggleArticleAngle(angle.id)}
                              disabled={isSubmitting}
                              className="sr-only"
                            />

                            <div className={`shrink-0 w-5 h-5 mt-0.5 rounded-md flex items-center justify-center transition-all ${
                              selectedArticleAngles.includes(angle.id)
                                ? "bg-sky-500 shadow-sm shadow-sky-500/30"
                                : "bg-zinc-200 dark:bg-zinc-700 group-hover/card:bg-sky-200 dark:group-hover/card:bg-sky-900/50"
                            }`}>
                              {selectedArticleAngles.includes(angle.id) && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-base">{angle.emoji}</span>
                                <span className={`text-sm font-medium transition-colors ${
                                  selectedArticleAngles.includes(angle.id)
                                    ? "text-sky-900 dark:text-sky-100"
                                    : "text-zinc-700 dark:text-zinc-300"
                                }`}>
                                  {angle.label}
                                </span>
                              </div>
                              <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-0.5">
                                {angle.description}
                              </span>
                            </div>
                          </motion.label>
                        ))}
                      </div>
                      <p className="text-xs text-zinc-500 mt-4">
                        Perfect for LinkedIn articles, blog posts, or newsletters
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Transcript Input */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="rounded-2xl bg-white dark:bg-zinc-900 shadow-sm overflow-hidden"
            >
              <div className="h-1 w-full bg-gradient-to-r from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600" />
              <div className="p-5">
                <label htmlFor="transcript" className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                  Transcript
                </label>
                <textarea
                  id="transcript"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste your podcast transcript here..."
                  rows={16}
                  disabled={isSubmitting}
                  className="w-full px-4 py-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-y disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  required
                />
                <p className="text-sm text-zinc-500 mt-3">
                  Tip: Copy the full transcript from Podscribe. We&apos;ll clean up timestamps automatically.
                </p>
              </div>
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Generate Button */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <button
                type="submit"
                disabled={isSubmitting || !transcript.trim() || !hasContentSelected}
                className={`w-full px-6 py-4 rounded-xl font-medium transition-all ${
                  isSubmitting
                    ? "bg-blue-600 text-white"
                    : !hasContentSelected || !transcript.trim()
                      ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                }`}
              >
                <span className="flex items-center justify-center gap-3">
                  {isSubmitting ? (
                    <>
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span>Starting generation...</span>
                    </>
                  ) : !hasContentSelected ? (
                    <span>Select at least one angle</span>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Generate content</span>
                      <div className="flex gap-2">
                        {selectedAngles.length > 0 && (
                          <span className="px-2.5 py-1 rounded-lg bg-white/20 text-xs font-medium">
                            {selectedAngles.length} post{selectedAngles.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {selectedArticleAngles.length > 0 && (
                          <span className="px-2.5 py-1 rounded-lg bg-white/20 text-xs font-medium">
                            {selectedArticleAngles.length} article{selectedArticleAngles.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </span>
              </button>
            </motion.div>
          </form>
        </div>
      </main>
    </div>
  );
}
