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
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md mx-4 p-8 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <span className="text-3xl">🚀</span>
          </div>

          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            You&apos;ve Hit Your Limit!
          </h2>

          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {usage
              ? `You've used all ${usage.limit} free generations this month.`
              : "You've used all your free generations this month."
            }
            {" "}Upgrade to Pro for unlimited content generation.
          </p>

          {/* Benefits */}
          <div className="text-left mb-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
            <ul className="space-y-2">
              {[
                "Unlimited content generations",
                "Priority processing",
                "Advanced analytics",
                "Early access to new features"
              ].map((benefit, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleUpgrade}
              disabled={isRedirecting}
              className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all"
            >
              {isRedirecting ? "Redirecting..." : "Upgrade to Pro — $29/month"}
            </button>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 text-neutral-600 dark:text-neutral-400 font-medium hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

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

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [quotaUsage, setQuotaUsage] = useState<{ count: number; limit: number } | undefined>();

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

        // Check if quota exceeded - show upgrade modal
        if (data.error === "quota_exceeded") {
          setQuotaUsage(data.usage);
          setShowUpgradeModal(true);
          setIsSubmitting(false);
          return;
        }

        throw new Error(data.message || data.error || "Generation failed");
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
      <AppHeader />

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

            {/* Post angle selection - Collapsible Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="group relative overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80 shadow-sm hover:shadow-lg transition-shadow duration-300"
            >
              {/* Gradient Accent Bar (Top Blade) */}
              <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />

              {/* Subtle glow effect behind the accent bar */}
              <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />

              {/* Header - Clickable to expand/collapse */}
              <button
                type="button"
                onClick={() => setPostsExpanded(!postsExpanded)}
                className="w-full px-6 py-4 flex justify-between items-center hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                    <span className="text-xl">📝</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      LinkedIn Posts
                      {selectedAngles.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                          {selectedAngles.length} selected
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
                      className="px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/60 disabled:opacity-50 transition-colors font-medium"
                    >
                      All
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
                  <motion.div
                    animate={{ rotate: postsExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 pt-2">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {POST_ANGLES.map((angle, i) => (
                          <motion.label
                            key={angle.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.03 }}
                            className={`group/card relative flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                              selectedAngles.includes(angle.id)
                                ? "bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 ring-2 ring-purple-500 dark:ring-purple-400 shadow-md shadow-purple-500/10"
                                : "bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 ring-1 ring-neutral-200 dark:ring-neutral-700 hover:ring-neutral-300 dark:hover:ring-neutral-600"
                            } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {/* Checkbox hidden but functional */}
                            <input
                              type="checkbox"
                              checked={selectedAngles.includes(angle.id)}
                              onChange={() => toggleAngle(angle.id)}
                              disabled={isSubmitting}
                              className="sr-only"
                            />

                            {/* Custom checkbox indicator */}
                            <div className={`shrink-0 w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                              selectedAngles.includes(angle.id)
                                ? "bg-purple-500 border-purple-500"
                                : "border-neutral-300 dark:border-neutral-600 group-hover/card:border-purple-400"
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
                                <span className={`text-sm font-semibold transition-colors ${
                                  selectedAngles.includes(angle.id)
                                    ? "text-purple-900 dark:text-purple-100"
                                    : "text-neutral-700 dark:text-neutral-300"
                                }`}>
                                  {angle.label}
                                </span>
                              </div>
                              <span className="text-xs text-neutral-500 dark:text-neutral-400 block mt-0.5 leading-relaxed">
                                {angle.description}
                              </span>
                            </div>
                          </motion.label>
                        ))}
                      </div>
                      <p className="text-xs text-neutral-500 mt-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        Each angle generates 2 versions per insight
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Article angle selection - Collapsible Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="group relative overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80 shadow-sm hover:shadow-lg transition-shadow duration-300"
            >
              {/* Gradient Accent Bar (Top Blade) */}
              <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />

              {/* Subtle glow effect behind the accent bar */}
              <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

              {/* Header - Clickable to expand/collapse */}
              <button
                type="button"
                onClick={() => setArticlesExpanded(!articlesExpanded)}
                className="w-full px-6 py-4 flex justify-between items-center hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <span className="text-xl">📄</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      LinkedIn Articles
                      {selectedArticleAngles.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                          {selectedArticleAngles.length} selected
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
                      className="px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 disabled:opacity-50 transition-colors font-medium"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={clearAllArticleAngles}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <motion.div
                    animate={{ rotate: articlesExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        {ARTICLE_ANGLES.map((angle, i) => (
                          <motion.label
                            key={angle.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.05 }}
                            className={`group/card relative flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                              selectedArticleAngles.includes(angle.id)
                                ? "bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 ring-2 ring-blue-500 dark:ring-blue-400 shadow-md shadow-blue-500/10"
                                : "bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 ring-1 ring-neutral-200 dark:ring-neutral-700 hover:ring-neutral-300 dark:hover:ring-neutral-600"
                            } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {/* Checkbox hidden but functional */}
                            <input
                              type="checkbox"
                              checked={selectedArticleAngles.includes(angle.id)}
                              onChange={() => toggleArticleAngle(angle.id)}
                              disabled={isSubmitting}
                              className="sr-only"
                            />

                            {/* Custom checkbox indicator */}
                            <div className={`shrink-0 w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                              selectedArticleAngles.includes(angle.id)
                                ? "bg-blue-500 border-blue-500"
                                : "border-neutral-300 dark:border-neutral-600 group-hover/card:border-blue-400"
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
                                <span className={`text-sm font-semibold transition-colors ${
                                  selectedArticleAngles.includes(angle.id)
                                    ? "text-blue-900 dark:text-blue-100"
                                    : "text-neutral-700 dark:text-neutral-300"
                                }`}>
                                  {angle.label}
                                </span>
                              </div>
                              <span className="text-xs text-neutral-500 dark:text-neutral-400 block mt-0.5 leading-relaxed">
                                {angle.description}
                              </span>
                            </div>
                          </motion.label>
                        ))}
                      </div>
                      <p className="text-xs text-neutral-500 mt-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        Perfect for LinkedIn articles, blog posts, or newsletters
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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

            {/* Sexy Generate Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <button
                type="submit"
                disabled={isSubmitting || !transcript.trim() || !hasContentSelected}
                className="group relative w-full overflow-hidden rounded-2xl font-semibold disabled:cursor-not-allowed transition-all duration-300"
              >
                {/* Animated gradient background */}
                <div className={`absolute inset-0 transition-all duration-500 ${
                  isSubmitting
                    ? "bg-gradient-to-r from-violet-600 via-purple-600 to-violet-600 animate-pulse"
                    : !hasContentSelected || !transcript.trim()
                      ? "bg-neutral-200 dark:bg-neutral-800"
                      : "bg-gradient-to-r from-violet-600 via-purple-600 via-50% to-fuchsia-600 bg-[length:200%_100%] group-hover:bg-[position:100%_0]"
                }`} />

                {/* Glow effect */}
                {!isSubmitting && hasContentSelected && transcript.trim() && (
                  <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 rounded-2xl opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-500" />
                )}

                {/* Shimmer effect */}
                {!isSubmitting && hasContentSelected && transcript.trim() && (
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                  </div>
                )}

                <span className={`relative flex items-center justify-center gap-3 px-6 py-4 ${
                  isSubmitting || !hasContentSelected || !transcript.trim()
                    ? "text-neutral-400 dark:text-neutral-500"
                    : "text-white"
                }`}>
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
                          <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-medium backdrop-blur-sm">
                            {selectedAngles.length} post{selectedAngles.length !== 1 ? 's' : ''} angles
                          </span>
                        )}
                        {selectedArticleAngles.length > 0 && (
                          <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-medium backdrop-blur-sm">
                            {selectedArticleAngles.length} article{selectedArticleAngles.length !== 1 ? 's' : ''} angles
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
