"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface UsageInfo {
  count: number;
  limit: number;
  remaining: number;
  subscriptionStatus: "free" | "pro";
}

export function UsageIndicator() {
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsage() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/usage");
        if (res.ok) {
          const data = await res.json();
          setUsage(data);
        }
      } catch (error) {
        console.error("Failed to fetch usage:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();
  }, []);

  if (loading || !usage) return null;

  // Pro users don't need to see limits
  if (usage.subscriptionStatus === "pro") {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
        <span className="text-xs font-medium px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
          Pro
        </span>
      </div>
    );
  }

  const percentage = (usage.count / usage.limit) * 100;
  const isLow = usage.remaining <= 3;
  const isExhausted = usage.remaining === 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600 dark:text-slate-400">
          Generations used
        </span>
        <span
          className={`font-medium ${
            isExhausted
              ? "text-red-600 dark:text-red-400"
              : isLow
              ? "text-amber-600 dark:text-amber-400"
              : "text-slate-900 dark:text-white"
          }`}
        >
          {usage.count}/{usage.limit}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            isExhausted
              ? "bg-red-500"
              : isLow
              ? "bg-amber-500"
              : "bg-indigo-500"
          }`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>

      {isLow && !isExhausted && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {usage.remaining} generations remaining
        </p>
      )}

      {isExhausted && (
        <p className="text-xs text-red-600 dark:text-red-400">
          No generations remaining.{" "}
          <a href="/settings" className="underline hover:no-underline">
            Upgrade to Pro
          </a>
        </p>
      )}
    </div>
  );
}
