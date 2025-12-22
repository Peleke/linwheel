import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="font-semibold text-lg">LinWheel</Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center">
        <div className="max-w-4xl mx-auto px-6 py-24">
          <h1 className="text-3xl font-bold mb-2">Pricing</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-12">
            Simple pricing for professionals who value their time.
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-2xl">
            {/* Free Tier */}
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
              <div className="text-sm font-medium text-neutral-500 mb-2">Current</div>
              <h2 className="text-2xl font-bold mb-1">Free</h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                Unlimited access during beta
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Unlimited generations</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span>
                  <span>4-5 posts per transcript</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Image intents</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Results saved</span>
                </li>
              </ul>
              <Link
                href="/generate"
                className="block w-full text-center px-6 py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
              >
                Get started
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="border border-neutral-300 dark:border-neutral-700 rounded-xl p-6 opacity-75">
              <div className="text-sm font-medium text-neutral-500 mb-2">Coming soon</div>
              <h2 className="text-2xl font-bold mb-1">Pro — $19/mo</h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                For serious content creators
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Everything in Free</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Cover image rendering</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span>
                  <span>PDF carousel export</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Brand templates</span>
                </li>
              </ul>
              <Link
                href="/checkout?plan=pro"
                className="block w-full text-center px-6 py-3 border border-neutral-300 rounded-lg font-medium hover:border-neutral-400 dark:border-neutral-700"
              >
                Join waitlist
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
