import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <span className="font-semibold text-lg">LinWheel</span>
          <nav className="flex gap-6 text-sm">
            <Link href="/pricing" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
              Pricing
            </Link>
            <Link href="/login" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col justify-center">
        <div className="max-w-4xl mx-auto px-6 py-24">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Turn AI noise into
            <br />
            LinkedIn posts
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-8 max-w-xl">
            Paste a podcast transcript. Get 4-5 ready-to-publish posts
            with image intents. Edit as needed. Post.
          </p>
          <div className="flex gap-4">
            <Link
              href="/generate"
              className="px-6 py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
            >
              Start generating
            </Link>
            <Link
              href="#how"
              className="px-6 py-3 border border-neutral-300 rounded-lg font-medium hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600"
            >
              How it works
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div id="how" className="border-t border-neutral-200 dark:border-neutral-800">
          <div className="max-w-4xl mx-auto px-6 py-24">
            <h2 className="text-2xl font-bold mb-12">How it works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <div className="text-4xl font-bold text-neutral-300 dark:text-neutral-700 mb-4">1</div>
                <h3 className="font-semibold mb-2">Paste transcript</h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Copy your podcast transcript from Podscribe or similar.
                  We clean timestamps and structure it.
                </p>
              </div>
              <div>
                <div className="text-4xl font-bold text-neutral-300 dark:text-neutral-700 mb-4">2</div>
                <h3 className="font-semibold mb-2">Extract insights</h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  We find the non-obvious claims that actually resonate
                  with professionals.
                </p>
              </div>
              <div>
                <div className="text-4xl font-bold text-neutral-300 dark:text-neutral-700 mb-4">3</div>
                <h3 className="font-semibold mb-2">Get posts</h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Receive 4-5 ready-to-publish LinkedIn posts with
                  image intents. Copy, tweak, post.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 py-8 text-sm text-neutral-500">
          LinWheel — Content distillation for professionals
        </div>
      </footer>
    </div>
  );
}
