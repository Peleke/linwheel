"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

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
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          sourceLabel: sourceLabel || "Untitled",
          selectedAngles,
          selectedArticleAngles,
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-neutral-50 via-white to-neutral-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-200/50 dark:border-neutral-800/50 backdrop-blur-sm bg-white/80 dark:bg-neutral-900/80 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="font-bold text-lg gradient-text">
            LinWheel
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-900 dark:from-white dark:via-neutral-300 dark:to-white">
              Generate content
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-8">
              Paste your podcast transcript below. We&apos;ll extract insights and generate
              posts and articles across multiple angles
              {expectedPosts > 0 && <span className="text-neutral-900 dark:text-white font-medium"> (up to {expectedPosts} posts)</span>}
              {expectedArticles > 0 && <span className="text-blue-600 dark:text-blue-400 font-medium">{expectedPosts > 0 ? " + " : " (up to "}{expectedArticles} articles{expectedPosts === 0 && ")"}</span>}
              .
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <label htmlFor="sourceLabel" className="block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
                Source label <span className="font-normal text-neutral-500">(optional)</span>
              </label>
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-neutral-300 to-neutral-200 dark:from-neutral-700 dark:to-neutral-600 rounded-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />
                <input
                  id="sourceLabel"
                  type="text"
                  value={sourceLabel}
                  onChange={(e) => setSourceLabel(e.target.value)}
                  placeholder="e.g., AI Daily Brief - Dec 22"
                  disabled={isSubmitting}
                  className="relative w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                />
              </div>
            </motion.div>

            {/* Post angle selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-neutral-50 via-white to-neutral-100/50 dark:from-neutral-900 dark:via-neutral-800/50 dark:to-neutral-900 border border-neutral-200/50 dark:border-neutral-700/50"
            >
              <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  LinkedIn Post angles
                </label>
                <div className="flex gap-3 text-xs">
                  <button
                    type="button"
                    onClick={selectAllAngles}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600 disabled:opacity-50 transition-colors font-medium"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={clearAllAngles}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {POST_ANGLES.map((angle, i) => (
                  <motion.label
                    key={angle.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className={`group relative flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all duration-300 ${
                      selectedAngles.includes(angle.id)
                        ? "border-neutral-900 bg-gradient-to-br from-neutral-100 to-neutral-50 dark:border-white dark:from-neutral-800 dark:to-neutral-900 shadow-md"
                        : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 hover:shadow-sm"
                    } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {/* Shimmer effect */}
                    {selectedAngles.includes(angle.id) && (
                      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      </div>
                    )}
                    <input
                      type="checkbox"
                      checked={selectedAngles.includes(angle.id)}
                      onChange={() => toggleAngle(angle.id)}
                      disabled={isSubmitting}
                      className="mt-1 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:ring-white"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold flex items-center gap-1.5">
                        <span>{angle.emoji}</span>
                        {angle.label}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 block mt-0.5">
                        {angle.description}
                      </span>
                    </div>
                  </motion.label>
                ))}
              </div>
              <p className="text-xs text-neutral-500 mt-4 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-neutral-400" />
                Each post angle generates 2 versions per insight. Short-form content for LinkedIn feed.
              </p>
            </motion.div>

            {/* Article angle selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-blue-50/50 dark:from-blue-900/10 dark:via-indigo-900/5 dark:to-blue-900/10 border border-blue-200/50 dark:border-blue-800/30"
            >
              <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                  <span className="text-lg">📄</span>
                  Article angles <span className="text-blue-500 dark:text-blue-400 font-normal">(500-750 words)</span>
                </label>
                <div className="flex gap-3 text-xs">
                  <button
                    type="button"
                    onClick={selectAllArticleAngles}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-full bg-blue-200 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-300 dark:hover:bg-blue-900/70 disabled:opacity-50 transition-colors font-medium"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={clearAllArticleAngles}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/40 disabled:opacity-50 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {ARTICLE_ANGLES.map((angle, i) => (
                  <motion.label
                    key={angle.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                    className={`group relative flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all duration-300 ${
                      selectedArticleAngles.includes(angle.id)
                        ? "border-blue-500 bg-gradient-to-br from-blue-100 to-indigo-50 dark:border-blue-400 dark:from-blue-900/30 dark:to-indigo-900/20 shadow-md shadow-blue-500/10"
                        : "border-blue-200/70 dark:border-blue-800/50 bg-white/50 dark:bg-neutral-900/50 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-sm"
                    } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {/* Shimmer effect */}
                    {selectedArticleAngles.includes(angle.id) && (
                      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-blue-100/30 to-transparent" />
                      </div>
                    )}
                    <input
                      type="checkbox"
                      checked={selectedArticleAngles.includes(angle.id)}
                      onChange={() => toggleArticleAngle(angle.id)}
                      disabled={isSubmitting}
                      className="mt-1 rounded border-blue-300 text-blue-600 focus:ring-blue-600 dark:border-blue-700 dark:bg-neutral-800"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold flex items-center gap-1.5 text-blue-900 dark:text-blue-100">
                        <span>{angle.emoji}</span>
                        {angle.label}
                      </span>
                      <span className="text-xs text-blue-600/70 dark:text-blue-400/70 block mt-0.5">
                        {angle.description}
                      </span>
                    </div>
                  </motion.label>
                ))}
              </div>
              <p className="text-xs text-blue-500 dark:text-blue-400 mt-4 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400" />
                Long-form articles for LinkedIn articles, blog posts, or newsletters.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <label htmlFor="transcript" className="block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
                Transcript
              </label>
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-neutral-300 via-neutral-200 to-neutral-300 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700 rounded-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />
                <textarea
                  id="transcript"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste your podcast transcript here..."
                  rows={16}
                  disabled={isSubmitting}
                  className="relative w-full px-4 py-4 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white resize-y disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  required
                />
              </div>
              <p className="text-sm text-neutral-500 mt-3 flex items-center gap-2">
                <span className="text-lg">💡</span>
                Tip: Copy the full transcript from Podscribe. We&apos;ll clean up timestamps automatically.
              </p>
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 flex items-center gap-3"
                >
                  <span className="text-xl">⚠️</span>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <button
                type="submit"
                disabled={isSubmitting || !transcript.trim() || !hasContentSelected}
                className="group relative w-full overflow-hidden rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {/* Button background with gradient */}
                <div className={`absolute inset-0 transition-all duration-300 ${
                  isSubmitting
                    ? "bg-gradient-to-r from-neutral-600 via-neutral-500 to-neutral-600 animate-pulse"
                    : !hasContentSelected || !transcript.trim()
                      ? "bg-neutral-300 dark:bg-neutral-700"
                      : "bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 dark:from-white dark:via-neutral-100 dark:to-white group-hover:from-neutral-800 group-hover:via-neutral-700 group-hover:to-neutral-800 dark:group-hover:from-neutral-100 dark:group-hover:via-neutral-200 dark:group-hover:to-neutral-100"
                }`} />

                {/* Shimmer effect */}
                {!isSubmitting && hasContentSelected && transcript.trim() && (
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  </div>
                )}

                <span className={`relative block px-6 py-4 ${
                  isSubmitting || !hasContentSelected || !transcript.trim()
                    ? "text-neutral-500 dark:text-neutral-400"
                    : "text-white dark:text-neutral-900"
                }`}>
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      <span className="ml-2">Starting generation...</span>
                    </span>
                  ) : !hasContentSelected ? (
                    "Select at least one angle"
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>Generate content</span>
                      {selectedAngles.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-white/20 dark:bg-neutral-900/20 text-xs">
                          {selectedAngles.length} posts
                        </span>
                      )}
                      {selectedArticleAngles.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/30 dark:bg-blue-600/30 text-xs">
                          {selectedArticleAngles.length} articles
                        </span>
                      )}
                    </span>
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
