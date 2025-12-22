import Link from "next/link";
import { db } from "@/db";
import { generationRuns, linkedinPosts, imageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CopyButton } from "@/components/copy-button";

interface Props {
  params: Promise<{ runId: string }>;
}

export default async function ResultsPage({ params }: Props) {
  const { runId } = await params;

  // Fetch run data
  const run = await db.query.generationRuns.findFirst({
    where: eq(generationRuns.id, runId),
  });

  if (!run) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Run not found</h1>
        <Link href="/generate" className="text-blue-600 hover:underline">
          Generate new posts
        </Link>
      </div>
    );
  }

  // Fetch posts with image intents
  const posts = await db.query.linkedinPosts.findMany({
    where: eq(linkedinPosts.runId, runId),
  });

  const intents = await db.query.imageIntents.findMany({
    where: eq(imageIntents.postId, posts[0]?.id ?? ""),
  });

  // Create a map of postId to imageIntent
  const intentsByPostId = new Map<string, typeof intents[0]>();
  for (const post of posts) {
    const intent = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.postId, post.id),
    });
    if (intent) intentsByPostId.set(post.id, intent);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="font-semibold text-lg">LinWheel</Link>
          <Link
            href="/generate"
            className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            New generation
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Run info */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">{run.sourceLabel}</h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Generated {posts.length} posts • {new Date(run.createdAt).toLocaleDateString()}
            </p>
          </div>

          {run.status === "processing" && (
            <div className="p-8 text-center border border-neutral-200 dark:border-neutral-800 rounded-xl mb-8">
              <div className="animate-pulse text-neutral-600 dark:text-neutral-400">
                Generating posts... This may take a minute.
              </div>
            </div>
          )}

          {run.status === "failed" && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 mb-8">
              Generation failed: {run.error || "Unknown error"}
            </div>
          )}

          {/* Posts */}
          <div className="space-y-8">
            {posts.map((post, index) => {
              const intent = intentsByPostId.get(post.id);
              return (
                <div
                  key={post.id}
                  className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden"
                >
                  {/* Post header */}
                  <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        Post {index + 1}
                      </span>
                      <span className="mx-2 text-neutral-300 dark:text-neutral-700">•</span>
                      <span className="text-sm text-neutral-500 capitalize">
                        {post.postType.replace("_", " ")}
                      </span>
                    </div>
                    <CopyButton text={post.fullText} />
                  </div>

                  {/* Post content */}
                  <div className="p-6">
                    <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
                      {post.fullText}
                    </pre>
                  </div>

                  {/* Image intent */}
                  {intent && (
                    <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Image Intent</h4>
                          <p className="text-lg font-semibold mb-1">&ldquo;{intent.headlineText}&rdquo;</p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {intent.visualStyle} • {intent.background} • {intent.mood}
                          </p>
                        </div>
                        <CopyButton
                          text={JSON.stringify(intent, null, 2)}
                          label="Copy intent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
