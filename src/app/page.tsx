import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <span className="font-semibold text-lg">LinWheel</span>
          <nav className="flex gap-6 text-sm">
            <Link href="#how" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
              How it works
            </Link>
            <Link href="/generate" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
              Try it
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="py-24 md:py-32">
          <div className="max-w-5xl mx-auto px-6">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
                Turn AI noise
                <br />
                into LinkedIn posts
              </h1>
              <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 mb-8 leading-relaxed">
                You listen to podcasts. You have insights.
                <br />
                But formatting them for LinkedIn takes forever.
              </p>
              <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-10">
                LinWheel transforms podcast transcripts into 4-5 ready-to-publish posts
                with image intents. Paste. Generate. Post.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/generate"
                  className="px-8 py-4 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-center"
                >
                  Start generating — free
                </Link>
                <Link
                  href="#waitlist"
                  className="px-8 py-4 border border-neutral-300 rounded-lg font-medium hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600 text-center"
                >
                  Join the waitlist
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="py-20 bg-neutral-50 dark:bg-neutral-900">
          <div className="max-w-5xl mx-auto px-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold mb-6">The problem</h2>
              <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-4">
                You&apos;re already consuming great AI content. Podcasts, newsletters, research.
              </p>
              <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-4">
                You have opinions. You see patterns others miss.
              </p>
              <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-4">
                But turning a 30-minute podcast into 4 LinkedIn posts?
                That&apos;s 2 hours of work. Minimum.
              </p>
              <p className="text-lg font-medium">
                Your insights die in your head because formatting is friction.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="py-20">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-2xl font-bold mb-12">How it works</h2>
            <div className="grid md:grid-cols-3 gap-12">
              <div>
                <div className="text-5xl font-bold text-neutral-200 dark:text-neutral-800 mb-4">1</div>
                <h3 className="text-xl font-semibold mb-3">Paste transcript</h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Copy from Podscribe or any transcript source.
                  Timestamps, speaker labels — we clean it all.
                </p>
              </div>
              <div>
                <div className="text-5xl font-bold text-neutral-200 dark:text-neutral-800 mb-4">2</div>
                <h3 className="text-xl font-semibold mb-3">Extract insights</h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  We find the non-obvious claims. The &ldquo;I&apos;ve felt this
                  but never said it&rdquo; moments that drive engagement.
                </p>
              </div>
              <div>
                <div className="text-5xl font-bold text-neutral-200 dark:text-neutral-800 mb-4">3</div>
                <h3 className="text-xl font-semibold mb-3">Get posts</h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  4-5 ready-to-publish LinkedIn posts. Each with
                  an image intent for carousel covers. Copy, tweak, post.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What you get */}
        <section className="py-20 bg-neutral-50 dark:bg-neutral-900">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-2xl font-bold mb-12">What you get</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl">
                <h3 className="font-semibold mb-2">Ready-to-publish posts</h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Not skeletons. Not outlines. Full posts with hooks,
                  body beats, and open questions that drive comments.
                </p>
              </div>
              <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl">
                <h3 className="font-semibold mb-2">Image intents</h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Visual direction for carousel covers. Headlines,
                  style notes, mood — ready for your design tool.
                </p>
              </div>
              <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl">
                <h3 className="font-semibold mb-2">Multiple post types</h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Contrarian takes, field notes, demystifications.
                  Different angles for different days.
                </p>
              </div>
              <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl">
                <h3 className="font-semibold mb-2">Saved results</h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Every generation is saved. Come back later,
                  copy what you need, never lose a post.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Waitlist */}
        <section id="waitlist" className="py-20">
          <div className="max-w-5xl mx-auto px-6">
            <div className="max-w-xl mx-auto text-center">
              <h2 className="text-2xl font-bold mb-4">Join the waitlist</h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-8">
                Get early access to new features: carousel PDF export,
                cover image generation, and voice customization.
              </p>
              <WaitlistForm />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Stop letting insights die</h2>
            <p className="text-xl text-neutral-400 dark:text-neutral-600 mb-8">
              One transcript. 4-5 posts. Free to try.
            </p>
            <Link
              href="/generate"
              className="inline-block px-8 py-4 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-white rounded-lg font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Generate your first posts
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-6 py-8 text-sm text-neutral-500">
          <div className="flex justify-between items-center">
            <span>LinWheel — Content distillation for professionals</span>
            <div className="flex gap-6">
              <Link href="/generate" className="hover:text-neutral-900 dark:hover:text-white">
                Generate
              </Link>
              <Link href="#how" className="hover:text-neutral-900 dark:hover:text-white">
                How it works
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
