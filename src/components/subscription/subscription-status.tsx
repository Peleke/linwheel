"use client";

import { useEffect, useState } from "react";

interface SubscriptionData {
  status: "free" | "pro";
  usage: {
    count: number;
    limit: number;
    remaining: number;
  };
  isPro: boolean;
}

export function SubscriptionStatus() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const response = await fetch("/api/stripe/subscription");
        if (response.ok) {
          const data = await response.json();
          setSubscription(data);
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSubscription();
  }, []);

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

  const handleManageSubscription = async () => {
    setIsRedirecting(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        console.error("Failed to create portal session");
        setIsRedirecting(false);
      }
    } catch (error) {
      console.error("Error opening portal:", error);
      setIsRedirecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-20 bg-neutral-200 dark:bg-neutral-700 rounded-lg" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
        <p className="text-neutral-500">Unable to load subscription status</p>
      </div>
    );
  }

  const { status, usage, isPro } = subscription;

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isPro
                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300"
                : "bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300"
            }`}
          >
            {isPro ? "Pro" : "Free"}
          </span>
          {isPro && (
            <span className="text-sm text-green-600 dark:text-green-400">
              Unlimited generations
            </span>
          )}
        </div>
      </div>

      {/* Usage Stats (Free tier only) */}
      {!isPro && (
        <div className="p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Generations used
            </span>
            <span className="text-sm font-medium">
              {usage.count} / {usage.limit}
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-600 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                usage.remaining === 0
                  ? "bg-red-500"
                  : usage.remaining <= 3
                  ? "bg-yellow-500"
                  : "bg-blue-500"
              }`}
              style={{ width: `${Math.min((usage.count / usage.limit) * 100, 100)}%` }}
            />
          </div>
          {usage.remaining === 0 && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              You&apos;ve used all your free generations. Upgrade to Pro for unlimited access.
            </p>
          )}
        </div>
      )}

      {/* Action Button */}
      <div>
        {isPro ? (
          <button
            onClick={handleManageSubscription}
            disabled={isRedirecting}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline disabled:opacity-50"
          >
            {isRedirecting ? "Opening..." : "Manage Subscription"}
          </button>
        ) : (
          <button
            onClick={handleUpgrade}
            disabled={isRedirecting}
            className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50"
          >
            {isRedirecting ? "Redirecting..." : "Upgrade to Pro — $29/month"}
          </button>
        )}
      </div>
    </div>
  );
}
