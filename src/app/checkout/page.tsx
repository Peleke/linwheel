"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "pro";

  const handleCheckout = () => {
    // Mock checkout: set plan in localStorage
    localStorage.setItem("linwheel_plan", plan);
    router.push("/generate");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="font-bold text-lg gradient-text">LinWheel</Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-sm w-full">
          <h1 className="text-2xl font-bold mb-2">Upgrade to Pro</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8">
            $19/month — Cancel anytime
          </p>

          {/* Mock Stripe Form */}
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 mb-6">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Card number</label>
              <input
                type="text"
                placeholder="4242 4242 4242 4242"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-transparent"
                disabled
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Expiry</label>
                <input
                  type="text"
                  placeholder="12/25"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-transparent"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">CVC</label>
                <input
                  type="text"
                  placeholder="123"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-transparent"
                  disabled
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            className="w-full px-6 py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            Complete Purchase (Demo)
          </button>

          <p className="text-sm text-neutral-500 mt-4 text-center">
            This is a mock checkout. No real payment will be processed.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
