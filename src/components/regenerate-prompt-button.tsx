"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface RegeneratePromptButtonProps {
  id: string;
  isArticle?: boolean;
  hasIntent: boolean;
}

export function RegeneratePromptButton({
  id,
  isArticle = false,
  hasIntent,
}: RegeneratePromptButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = isArticle
        ? `/api/articles/${id}/regenerate-prompt`
        : `/api/posts/${id}/regenerate-prompt`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to regenerate prompt");
      }

      // Refresh to show updated prompt
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <motion.button
        onClick={handleRegenerate}
        disabled={isLoading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md
          transition-colors duration-200
          ${isLoading
            ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-wait"
            : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
          }
        `}
        title={hasIntent ? "Regenerate image prompt with AI" : "Generate image prompt with AI"}
      >
        {isLoading ? (
          <>
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Regenerating...</span>
          </>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{hasIntent ? "Regen prompt" : "Gen prompt"}</span>
          </>
        )}
      </motion.button>
      {error && (
        <span className="text-xs text-red-500" title={error}>
          Failed
        </span>
      )}
    </div>
  );
}
