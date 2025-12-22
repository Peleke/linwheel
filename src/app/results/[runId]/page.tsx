import Link from "next/link";
import { db } from "@/db";
import { generationRuns, linkedinPosts, imageIntents, POST_ANGLES, type PostAngle } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CopyButton } from "@/components/copy-button";
import { ApprovalButtons } from "@/components/approval-buttons";
import { StatusPoller } from "@/components/status-poller";
import { ANGLE_DESCRIPTIONS } from "@/lib/prompts/angles";

interface Props {
  params: Promise<{ runId: string }>;
}

// Group posts by angle
type PostWithIntent = {
  id: string;
  hook: string;
  fullText: string;
  postType: PostAngle;
  versionNumber: number | null;
  approved: boolean | null;
  imageIntent?: {
    headlineText: string;
    prompt: string;
    negativePrompt: string;
    stylePreset: string;
  };
};

type PostsByAngle = Record<PostAngle, PostWithIntent[]>;

export default async function ResultsDashboardPage({ params }: Props) {
  const { runId } = await params;

  // Fetch run data
  const run = await db.query.generationRuns.findFirst({
    where: eq(generationRuns.id, runId),
  });

  if (!run) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Run not found</h1>
        <Link href="/results" className="text-blue-600 hover:underline">
          Back to all runs
        </Link>
      </div>
    );
  }

  // Fetch posts
  const posts = await db.query.linkedinPosts.findMany({
    where: eq(linkedinPosts.runId, runId),
  });

  // Fetch image intents and build lookup
  const postsWithIntents: PostWithIntent[] = await Promise.all(
    posts.map(async (post) => {
      const intent = await db.query.imageIntents.findFirst({
        where: eq(imageIntents.postId, post.id),
      });
      return {
        id: post.id,
        hook: post.hook,
        fullText: post.fullText,
        postType: post.postType as PostAngle,
        versionNumber: post.versionNumber,
        approved: post.approved,
        imageIntent: intent ? {
          headlineText: intent.headlineText,
          prompt: intent.prompt,
          negativePrompt: intent.negativePrompt,
          stylePreset: intent.stylePreset,
        } : undefined,
      };
    })
  );

  // Group by angle
  const postsByAngle = POST_ANGLES.reduce<PostsByAngle>((acc, angle) => {
    acc[angle] = postsWithIntents.filter(p => p.postType === angle)
      .sort((a, b) => (a.versionNumber ?? 0) - (b.versionNumber ?? 0));
    return acc;
  }, {} as PostsByAngle);

  // Count stats
  const approvedCount = postsWithIntents.filter(p => p.approved).length;
  const anglesWithPosts = POST_ANGLES.filter(a => postsByAngle[a].length > 0);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="font-semibold text-lg">LinWheel</Link>
          <div className="flex gap-4">
            <Link
              href="/results"
              className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              All runs
            </Link>
            <Link
              href="/generate"
              className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              New generation
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Run header */}
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold mb-2">{run.sourceLabel}</h1>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {posts.length} posts • {approvedCount} approved • {formatDate(run.createdAt)}
                </p>
              </div>
              <StatusBadge status={run.status} />
            </div>

            {/* Status poller for pending/processing runs */}
            <StatusPoller runId={runId} status={run.status} />

            {(run.status === "pending" || run.status === "processing") && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                  <span className="text-blue-700 dark:text-blue-400">
                    {run.status === "pending"
                      ? "Starting generation..."
                      : `Generating posts${anglesWithPosts.length > 0 ? ` across ${anglesWithPosts.length} angles` : ""}... This may take a few minutes.`}
                  </span>
                </div>
              </div>
            )}

            {run.status === "failed" && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                Generation failed: {run.error || "Unknown error"}
              </div>
            )}
          </div>

          {/* Angle buckets */}
          <div className="space-y-8">
            {anglesWithPosts.map((angle) => (
              <AngleBucket
                key={angle}
                angle={angle}
                posts={postsByAngle[angle]}
                runId={runId}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function AngleBucket({
  angle,
  posts,
  runId,
}: {
  angle: PostAngle;
  posts: PostWithIntent[];
  runId: string;
}) {
  const approvedCount = posts.filter(p => p.approved).length;

  return (
    <details className="group border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden" open>
      <summary className="px-6 py-4 bg-neutral-50 dark:bg-neutral-900 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 list-none">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold capitalize">
              {angle.replace("_", " ")}
            </span>
            <span className="text-sm text-neutral-500">
              {ANGLE_DESCRIPTIONS[angle]}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {posts.length} versions • {approvedCount} approved
            </span>
            <span className="text-neutral-400 group-open:rotate-180 transition-transform">
              ▼
            </span>
          </div>
        </div>
      </summary>

      <div className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} runId={runId} />
        ))}
      </div>
    </details>
  );
}

function PostCard({ post, runId }: { post: PostWithIntent; runId: string }) {
  return (
    <div className={`border rounded-lg overflow-hidden ${
      post.approved
        ? "border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10"
        : "border-neutral-200 dark:border-neutral-700"
    }`}>
      {/* Card header */}
      <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
        <span className="text-sm font-medium">
          Version {post.versionNumber ?? 1}
        </span>
        {post.approved && (
          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400 rounded-full">
            Approved
          </span>
        )}
      </div>

      {/* Hook preview */}
      <div className="p-4">
        <p className="text-sm font-medium mb-2 line-clamp-2">{post.hook}</p>
        <details className="text-sm text-neutral-600 dark:text-neutral-400">
          <summary className="cursor-pointer hover:text-neutral-900 dark:hover:text-white">
            View full post
          </summary>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed border-t border-neutral-200 dark:border-neutral-700 pt-3">
            {post.fullText}
          </pre>
        </details>
      </div>

      {/* Image intent */}
      {post.imageIntent && (
        <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700">
          <details className="text-sm">
            <summary className="cursor-pointer text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
              Image: &ldquo;{post.imageIntent.headlineText}&rdquo;
            </summary>
            <div className="mt-2 p-2 bg-neutral-100 dark:bg-neutral-800 rounded text-xs font-mono">
              <p className="text-green-600 dark:text-green-400">{post.imageIntent.prompt}</p>
              <p className="text-red-600 dark:text-red-400 mt-1">Negative: {post.imageIntent.negativePrompt}</p>
            </div>
          </details>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
        <ApprovalButtons postId={post.id} approved={post.approved ?? false} />
        <CopyButton text={post.fullText} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    complete: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <span className={`px-3 py-1 text-sm font-medium rounded-full ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
