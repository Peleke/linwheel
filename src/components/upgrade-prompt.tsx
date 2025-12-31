"use client";

import { useState } from "react";

interface UpgradePromptProps {
  onClose?: () => void;
}

export function UpgradePrompt({ onClose }: UpgradePromptProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInterest = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/upgrade-interest", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to submit interest");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🎉</span>
          <h3 className="font-semibold text-lg text-emerald-800 dark:text-emerald-300">
            Thanks for your interest!
          </h3>
        </div>
        <p className="text-emerald-700 dark:text-emerald-400">
          We&apos;ll reach out to you soon with details about LinWheel Pro.
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Dismiss
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">🚀</span>
        <h3 className="font-semibold text-lg text-amber-800 dark:text-amber-300">
          You&apos;ve used all 10 free generations
        </h3>
      </div>

      <p className="text-amber-700 dark:text-amber-400 mb-4">
        Unlock unlimited generations with LinWheel Pro. We&apos;ll personally
        reach out to set you up.
      </p>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
      )}

      <button
        onClick={handleInterest}
        disabled={loading}
        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-lg shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all disabled:opacity-50"
      >
        {loading ? "Submitting..." : "I'm interested in Pro"}
      </button>

      {onClose && (
        <button
          onClick={onClose}
          className="ml-3 text-sm text-amber-600 dark:text-amber-400 hover:underline"
        >
          Maybe later
        </button>
      )}
    </div>
  );
}
