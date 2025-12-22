"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface GenerateMoreButtonProps {
  runId: string;
  angle: string;
}

export function GenerateMoreButton({ runId, angle }: GenerateMoreButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [count, setCount] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/runs/${runId}/generate-more`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ angle, count }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate more posts");
      }

      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error generating more:", error);
      alert(error instanceof Error ? error.message : "Failed to generate more posts");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
      >
        + Generate more
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">
              Generate More {angle.replace("_", " ")} Posts
            </h3>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                How many additional posts?
              </label>
              <div className="flex items-center gap-3">
                {[1, 2, 3, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      count === n
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                        : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsOpen(false)}
                disabled={isGenerating}
                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-4 py-2 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : `Generate ${count}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
