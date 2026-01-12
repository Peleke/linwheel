"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AppHeader } from "@/components/app-header";
import { getStoredLLMPreferences } from "@/hooks/use-llm-preferences";

// Upgrade modal component
function UpgradeModal({
  isOpen,
  onClose,
  usage
}: {
  isOpen: boolean;
  onClose: () => void;
  usage?: { count: number; limit: number };
}) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleUpgrade = async () => {
    setIsRedirecting(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingCycle: "monthly" }),
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        console.error("Failed to create checkout session");
        setIsRedirecting(false);
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      setIsRedirecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md mx-4 p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 dark:bg-zinc-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
            You&apos;ve Hit Your Limit
          </h2>

          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            {usage
              ? `You've used all ${usage.limit} free generations this month.`
              : "You've used all your free generations this month."
            }
            {" "}Upgrade to Pro for unlimited content generation.
          </p>

          <div className="text-left mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
            <ul className="space-y-2">
              {[
                "Unlimited content generations",
                "Priority processing",
                "Advanced analytics",
                "Early access to new features"
              ].map((benefit, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleUpgrade}
              disabled={isRedirecting}
              className="w-full px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 transition-all"
            >
              {isRedirecting ? "Redirecting..." : "Upgrade to Pro — $29/month"}
            </button>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 text-zinc-600 dark:text-zinc-400 font-medium hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Post angles
const POST_ANGLES = [
  { id: "contrarian", label: "Contrarian", emoji: "🔥" },
  { id: "field_note", label: "Field Note", emoji: "📝" },
  { id: "demystification", label: "Demystification", emoji: "💡" },
  { id: "identity_validation", label: "Identity Validation", emoji: "🎯" },
  { id: "provocateur", label: "Provocateur", emoji: "⚡" },
  { id: "synthesizer", label: "Synthesizer", emoji: "🧩" },
  { id: "curious_cat", label: "Curious Cat", emoji: "🐱" },
] as const;

// Article angles
const ARTICLE_ANGLES = [
  { id: "deep_dive", label: "Deep Dive", emoji: "🌊" },
  { id: "contrarian", label: "Contrarian", emoji: "🔥" },
  { id: "how_to", label: "How To", emoji: "📋" },
  { id: "case_study", label: "Case Study", emoji: "📊" },
] as const;

type PostAngleId = typeof POST_ANGLES[number]["id"];
type ArticleAngleId = typeof ARTICLE_ANGLES[number]["id"];

export default function GeneratePage() {
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [selectedAngles, setSelectedAngles] = useState<PostAngleId[]>(
    POST_ANGLES.map(a => a.id)
  );
  const [selectedArticleAngles, setSelectedArticleAngles] = useState<ArticleAngleId[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [quotaUsage, setQuotaUsage] = useState<{ count: number; limit: number } | undefined>();

  // Toggle functions
  const toggleAngle = (angleId: PostAngleId) => {
    setSelectedAngles(prev =>
      prev.includes(angleId)
        ? prev.filter(a => a !== angleId)
        : [...prev, angleId]
    );
  };

  const toggleArticleAngle = (angleId: ArticleAngleId) => {
    setSelectedArticleAngles(prev =>
      prev.includes(angleId)
        ? prev.filter(a => a !== angleId)
        : [...prev, angleId]
    );
  };

  // Preset functions
  const selectPostsOnly = () => {
    setSelectedAngles(POST_ANGLES.map(a => a.id));
    setSelectedArticleAngles([]);
  };

  const selectArticlesOnly = () => {
    setSelectedAngles([]);
    setSelectedArticleAngles(ARTICLE_ANGLES.map(a => a.id));
  };

  const selectAll = () => {
    setSelectedAngles(POST_ANGLES.map(a => a.id));
    setSelectedArticleAngles(ARTICLE_ANGLES.map(a => a.id));
  };

  const hasContentSelected = selectedAngles.length > 0 || selectedArticleAngles.length > 0;
  const canSubmit = transcript.trim().length > 0 && hasContentSelected && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
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

        if (data.error === "quota_exceeded") {
          setQuotaUsage(data.usage);
          setShowUpgradeModal(true);
          setIsSubmitting(false);
          return;
        }

        throw new Error(data.message || data.error || "Generation failed");
      }

      const data = await response.json();
      router.push(`/results/${data.runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />

      <main className="flex-1 pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              Generate content
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Paste your transcript and we&apos;ll create LinkedIn posts and articles.
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Transcript Input - THE MAIN EVENT */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="p-4 sm:p-5 space-y-4">
                {/* Source label - inline */}
                <div>
                  <input
                    id="sourceLabel"
                    type="text"
                    value={sourceLabel}
                    onChange={(e) => setSourceLabel(e.target.value)}
                    placeholder="Source label (optional) — e.g., AI Daily Brief - Jan 12"
                    disabled={isSubmitting}
                    className="w-full px-0 py-2 text-sm text-zinc-900 dark:text-zinc-100 bg-transparent placeholder-zinc-400 dark:placeholder-zinc-500 border-b border-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 disabled:opacity-50 transition-colors"
                  />
                </div>

                {/* Transcript textarea */}
                <textarea
                  id="transcript"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste your podcast transcript, article, notes, or any source material here..."
                  rows={14}
                  disabled={isSubmitting}
                  className="w-full px-0 py-2 text-zinc-900 dark:text-zinc-100 bg-transparent placeholder-zinc-400 dark:placeholder-zinc-500 text-[15px] leading-relaxed focus:outline-none resize-y min-h-[200px] disabled:opacity-50 transition-all"
                  required
                />
              </div>

              {/* Character count */}
              <div className="px-4 sm:px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <span className="text-xs text-zinc-400">
                  {transcript.length > 0 ? `${transcript.length.toLocaleString()} characters` : "Paste your content above"}
                </span>
                {transcript.length > 500 && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Good length
                  </span>
                )}
              </div>
            </motion.div>

            {/* Quick Presets */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex flex-wrap gap-2"
            >
              <span className="text-xs text-zinc-500 dark:text-zinc-400 self-center mr-1">Quick:</span>
              <button
                type="button"
                onClick={selectPostsOnly}
                disabled={isSubmitting}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                  selectedAngles.length === POST_ANGLES.length && selectedArticleAngles.length === 0
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                Posts only
              </button>
              <button
                type="button"
                onClick={selectArticlesOnly}
                disabled={isSubmitting}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                  selectedAngles.length === 0 && selectedArticleAngles.length === ARTICLE_ANGLES.length
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                Articles only
              </button>
              <button
                type="button"
                onClick={selectAll}
                disabled={isSubmitting}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                  selectedAngles.length === POST_ANGLES.length && selectedArticleAngles.length === ARTICLE_ANGLES.length
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                Everything
              </button>
            </motion.div>

            {/* Content Type Selection */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="space-y-5"
            >
              {/* Posts */}
              <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Posts</span>
                    {selectedAngles.length > 0 && (
                      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {selectedAngles.length}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedAngles(POST_ANGLES.map(a => a.id))}
                      disabled={isSubmitting}
                      className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-50"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAngles([])}
                      disabled={isSubmitting}
                      className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-50"
                    >
                      None
                    </button>
                  </div>
                </div>

                <div data-testid="post-angles-grid" className="flex flex-wrap gap-2">
                  {POST_ANGLES.map((angle) => (
                    <button
                      key={angle.id}
                      type="button"
                      data-testid="angle-button"
                      onClick={() => toggleAngle(angle.id)}
                      disabled={isSubmitting}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-all disabled:opacity-50 ${
                        selectedAngles.includes(angle.id)
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      <span>{angle.emoji}</span>
                      <span className="font-medium">{angle.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Articles */}
              <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Articles</span>
                    {selectedArticleAngles.length > 0 && (
                      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {selectedArticleAngles.length}
                      </span>
                    )}
                    <span className="text-xs text-zinc-400">(long-form)</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedArticleAngles(ARTICLE_ANGLES.map(a => a.id))}
                      disabled={isSubmitting}
                      className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-50"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedArticleAngles([])}
                      disabled={isSubmitting}
                      className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-50"
                    >
                      None
                    </button>
                  </div>
                </div>

                <div data-testid="article-angles-grid" className="flex flex-wrap gap-2">
                  {ARTICLE_ANGLES.map((angle) => (
                    <button
                      key={angle.id}
                      type="button"
                      data-testid="angle-button"
                      onClick={() => toggleArticleAngle(angle.id)}
                      disabled={isSubmitting}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-all disabled:opacity-50 ${
                        selectedArticleAngles.includes(angle.id)
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      <span>{angle.emoji}</span>
                      <span className="font-medium">{angle.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </main>

      {/* Sticky Generate Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-50 via-zinc-50 to-zinc-50/0 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950/0 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <motion.button
            type="submit"
            onClick={handleSubmit}
            disabled={!canSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className={`w-full px-6 py-4 rounded-xl font-medium transition-all shadow-lg ${
              isSubmitting
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                : !canSubmit
                  ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed shadow-none"
                  : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-zinc-900/20 dark:shadow-white/10"
            }`}
          >
            <span className="flex items-center justify-center gap-3">
              {isSubmitting ? (
                <>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span>Starting generation...</span>
                </>
              ) : !hasContentSelected ? (
                <span>Select content types above</span>
              ) : !transcript.trim() ? (
                <span>Paste your transcript to continue</span>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Generate</span>
                  {(selectedAngles.length > 0 || selectedArticleAngles.length > 0) && (
                    <span className="text-sm opacity-70">
                      {selectedAngles.length > 0 && `${selectedAngles.length} post${selectedAngles.length !== 1 ? 's' : ''}`}
                      {selectedAngles.length > 0 && selectedArticleAngles.length > 0 && ' + '}
                      {selectedArticleAngles.length > 0 && `${selectedArticleAngles.length} article${selectedArticleAngles.length !== 1 ? 's' : ''}`}
                    </span>
                  )}
                </>
              )}
            </span>
          </motion.button>
        </div>
      </div>

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <UpgradeModal
            isOpen={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            usage={quotaUsage}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
