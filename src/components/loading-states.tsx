"use client";

import { useEffect, useState } from "react";

// Fun loading messages by angle
const LOADING_MESSAGES = {
  contrarian: [
    "Summoning the Contrarian...",
    "Challenging conventional wisdom...",
    "Finding unpopular truths...",
    "Questioning everything...",
  ],
  field_note: [
    "Reviewing field notes...",
    "Recalling observations...",
    "Documenting discoveries...",
    "Mining real experiences...",
  ],
  demystification: [
    "Stripping the glamour...",
    "Revealing what's really going on...",
    "Cutting through the hype...",
    "Finding the unsexy truth...",
  ],
  identity_validation: [
    "Finding your people...",
    "Validating the outliers...",
    "Making space for the misfits...",
    "Celebrating the unconventional...",
  ],
  provocateur: [
    "Stirring the pot...",
    "Crafting hot takes...",
    "Preparing to ruffle feathers...",
    "Loading controversial opinions...",
  ],
  synthesizer: [
    "Connecting distant dots...",
    "Cross-pollinating ideas...",
    "Building unexpected bridges...",
    "Weaving patterns...",
  ],
  curious_cat: [
    "Asking the big questions...",
    "Wondering out loud...",
    "Probing assumptions...",
    "Following the curiosity...",
  ],
  general: [
    "Extracting insights...",
    "Analyzing your transcript...",
    "Finding the gold...",
    "Crafting your posts...",
    "Almost there...",
  ],
};

interface LoadingSpinnerProps {
  angle?: keyof typeof LOADING_MESSAGES;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ angle = "general", size = "md" }: LoadingSpinnerProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = LOADING_MESSAGES[angle] || LOADING_MESSAGES.general;

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [messages.length]);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`${sizeClasses[size]} animate-spin`}>
        <svg className="w-full h-full text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      <p className="text-sm text-neutral-400 animate-pulse">{messages[messageIndex]}</p>
    </div>
  );
}

// Skeleton loader for post cards
export function PostCardSkeleton() {
  return (
    <div className="p-6 bg-neutral-800/50 rounded-xl border border-neutral-700/50 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neutral-700" />
          <div className="w-24 h-4 bg-neutral-700 rounded" />
        </div>
        <div className="w-16 h-8 bg-neutral-700 rounded" />
      </div>

      {/* Content */}
      <div className="space-y-3">
        <div className="w-full h-5 bg-neutral-700 rounded" />
        <div className="w-3/4 h-5 bg-neutral-700 rounded" />
        <div className="w-5/6 h-5 bg-neutral-700 rounded" />
      </div>

      {/* Footer */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-neutral-700">
        <div className="w-20 h-8 bg-neutral-700 rounded" />
        <div className="w-20 h-8 bg-neutral-700 rounded" />
      </div>
    </div>
  );
}

// Generation progress with stages
interface GenerationProgressProps {
  stage: "extracting" | "writing" | "finalizing";
  anglesComplete?: number;
  totalAngles?: number;
}

export function GenerationProgress({
  stage,
  anglesComplete = 0,
  totalAngles = 6,
}: GenerationProgressProps) {
  const stages = [
    { id: "extracting", label: "Extracting insights" },
    { id: "writing", label: "Writing posts" },
    { id: "finalizing", label: "Finalizing" },
  ];

  const currentIndex = stages.findIndex((s) => s.id === stage);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Stage indicators */}
      <div className="flex items-center justify-between mb-4">
        {stages.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i <= currentIndex
                  ? "bg-indigo-500 text-white"
                  : "bg-neutral-700 text-neutral-400"
              }`}
            >
              {i < currentIndex ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            {i < stages.length - 1 && (
              <div
                className={`w-16 h-0.5 mx-2 transition-colors ${
                  i < currentIndex ? "bg-indigo-500" : "bg-neutral-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Current stage label */}
      <p className="text-center text-neutral-300 mb-2">
        {stages[currentIndex]?.label}...
      </p>

      {/* Angle progress (for writing stage) */}
      {stage === "writing" && (
        <div className="text-center text-sm text-neutral-500">
          {anglesComplete} of {totalAngles} angles complete
        </div>
      )}
    </div>
  );
}
