"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ArticleAngle } from "@/db/schema";

interface GenerateMoreArticlesButtonProps {
  runId: string;
  angle: ArticleAngle;
}

export function GenerateMoreArticlesButton({
  runId,
  angle,
}: GenerateMoreArticlesButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [count, setCount] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setError(null);

    try {
      const response = await fetch(`/api/runs/${runId}/generate-more-articles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ angle, count }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate");
      }

      setIsOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors"
      >
        + Generate more
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 mb-4">
              Generate more {angle.replace("_", " ")} articles
            </h3>

            <div className="mb-4">
              <label className="text-sm text-zinc-600 dark:text-zinc-400 block mb-2">
                How many articles?
              </label>
              <div className="flex gap-2">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors text-sm font-medium ${
                      count === n
                        ? "border-blue-600 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-400"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="flex-1 px-4 py-2 text-sm font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={isPending}
                className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
