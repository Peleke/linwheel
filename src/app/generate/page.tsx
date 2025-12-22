"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type LoadingStage = "chunking" | "extracting" | "generating" | null;

const STAGE_LABELS: Record<Exclude<LoadingStage, null>, string> = {
  chunking: "Chunking transcript...",
  extracting: "Extracting insights...",
  generating: "Generating posts...",
};

const STAGE_DURATIONS = {
  chunking: 3000,
  extracting: 8000,
  generating: 15000,
};

// Angle configuration
const ANGLES = [
  { id: "contrarian", label: "Contrarian", description: "Challenges widely-held beliefs" },
  { id: "field_note", label: "Field Note", description: "Observations from real work" },
  { id: "demystification", label: "Demystification", description: "Strips glamour from sacred cows" },
  { id: "identity_validation", label: "Identity Validation", description: "Makes outliers feel seen" },
  { id: "provocateur", label: "Provocateur", description: "Stirs debate with edgy takes" },
  { id: "synthesizer", label: "Synthesizer", description: "Connects dots across domains" },
] as const;

type AngleId = typeof ANGLES[number]["id"];

export default function GeneratePage() {
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [selectedAngles, setSelectedAngles] = useState<AngleId[]>(
    ANGLES.map(a => a.id) // All selected by default
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleAngle = (angleId: AngleId) => {
    setSelectedAngles(prev =>
      prev.includes(angleId)
        ? prev.filter(a => a !== angleId)
        : [...prev, angleId]
    );
  };

  const selectAllAngles = () => {
    setSelectedAngles(ANGLES.map(a => a.id));
  };

  const clearAllAngles = () => {
    setSelectedAngles([]);
  };

  // Progress through loading stages
  useEffect(() => {
    if (!isLoading) {
      setLoadingStage(null);
      return;
    }

    setLoadingStage("chunking");

    const timer1 = setTimeout(() => {
      setLoadingStage("extracting");
    }, STAGE_DURATIONS.chunking);

    const timer2 = setTimeout(() => {
      setLoadingStage("generating");
    }, STAGE_DURATIONS.chunking + STAGE_DURATIONS.extracting);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          sourceLabel: sourceLabel || "Untitled",
          selectedAngles,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await response.json();
      router.push(`/results/${data.runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="font-semibold text-lg">LinWheel</Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <h1 className="text-2xl font-bold mb-2">Generate posts</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8">
            Paste your podcast transcript below. We&apos;ll extract insights and generate
            posts across multiple angles (up to {selectedAngles.length * 5 * 3} posts).
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="sourceLabel" className="block text-sm font-medium mb-2">
                Source label (optional)
              </label>
              <input
                id="sourceLabel"
                type="text"
                value={sourceLabel}
                onChange={(e) => setSourceLabel(e.target.value)}
                placeholder="e.g., AI Daily Brief - Dec 22"
                disabled={isLoading}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Angle selection */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium">
                  Content angles
                </label>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllAngles}
                    disabled={isLoading}
                    className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white disabled:opacity-50"
                  >
                    Select all
                  </button>
                  <span className="text-neutral-300 dark:text-neutral-700">|</span>
                  <button
                    type="button"
                    onClick={clearAllAngles}
                    disabled={isLoading}
                    className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ANGLES.map((angle) => (
                  <label
                    key={angle.id}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedAngles.includes(angle.id)
                        ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900"
                        : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500"
                    } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAngles.includes(angle.id)}
                      onChange={() => toggleAngle(angle.id)}
                      disabled={isLoading}
                      className="mt-1 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:ring-white"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium block">{angle.label}</span>
                      <span className="text-xs text-neutral-500 block truncate">
                        {angle.description}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                Each angle generates 5 versions per insight. More angles = more options to choose from.
              </p>
            </div>

            <div>
              <label htmlFor="transcript" className="block text-sm font-medium mb-2">
                Transcript
              </label>
              <textarea
                id="transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste your podcast transcript here..."
                rows={16}
                disabled={isLoading}
                className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-transparent font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white resize-y disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
              <p className="text-sm text-neutral-500 mt-2">
                Tip: Copy the full transcript from Podscribe. We&apos;ll clean up timestamps automatically.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !transcript.trim() || selectedAngles.length === 0}
              className="w-full px-6 py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && loadingStage
                ? STAGE_LABELS[loadingStage]
                : selectedAngles.length === 0
                  ? "Select at least one angle"
                  : `Generate posts (${selectedAngles.length} angles)`}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
