/**
 * Checkout Success Page
 *
 * Shown after successful subscription purchase.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function CheckoutSuccessPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <svg
              className="h-8 w-8 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="mt-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Welcome to Pro!
          </h1>

          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Your subscription is now active. You have unlimited access to all
            features.
          </p>

          <div className="mt-8 space-y-4">
            <Link
              href="/"
              className="block w-full py-3 px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              Start Generating
            </Link>

            <Link
              href="/settings"
              className="block w-full py-3 px-4 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Manage Subscription
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
