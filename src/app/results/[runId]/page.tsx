import Link from "next/link";
import { db } from "@/db";
import {
  generationRuns, linkedinPosts, imageIntents, articles, articleImageIntents,
  POST_ANGLES, ARTICLE_ANGLES, type PostAngle, type ArticleAngle
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { StatusPoller } from "@/components/status-poller";
import { DeleteRunButton } from "@/components/delete-run-button";
import { GenerateMoreButton } from "@/components/generate-more-button";
import { GenerateMoreArticlesButton } from "@/components/generate-more-articles-button";
import { RetryButton } from "@/components/retry-button";
import { ContentTabs } from "@/components/content-tabs";
import { ArticleCard } from "@/components/article-card";
import { PostCard } from "@/components/post-card";
import { ResultsClientWrapper } from "@/components/results-client-wrapper";
import { ToastContainer } from "@/components/toast";

import { ANGLE_DESCRIPTIONS } from "@/lib/prompts/angles";
import { ARTICLE_ANGLE_DESCRIPTIONS } from "@/lib/prompts/article-angles";

export const dynamic = "force-dynamic";

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

// Group articles by angle
type ArticleWithIntent = {
  id: string;
  title: string;
  subtitle: string | null;
  introduction: string;
  sections: string[];
  conclusion: string;
  fullText: string;
  articleType: ArticleAngle;
  versionNumber: number | null;
  approved: boolean | null;
  imageIntent?: {
    headlineText: string;
    prompt: string;
    negativePrompt: string;
    stylePreset: string;
  };
};

type ArticlesByAngle = Record<ArticleAngle, ArticleWithIntent[]>;

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

  // Fetch articles
  const articleRecords = await db.query.articles.findMany({
    where: eq(articles.runId, runId),
  });

  // Fetch article image intents and build lookup
  const articlesWithIntents: ArticleWithIntent[] = await Promise.all(
    articleRecords.map(async (article) => {
      const intent = await db.query.articleImageIntents.findFirst({
        where: eq(articleImageIntents.articleId, article.id),
      });
      return {
        id: article.id,
        title: article.title,
        subtitle: article.subtitle,
        introduction: article.introduction,
        sections: article.sections as string[],
        conclusion: article.conclusion,
        fullText: article.fullText,
        articleType: article.articleType as ArticleAngle,
        versionNumber: article.versionNumber,
        approved: article.approved,
        imageIntent: intent ? {
          headlineText: intent.headlineText,
          prompt: intent.prompt,
          negativePrompt: intent.negativePrompt,
          stylePreset: intent.stylePreset,
        } : undefined,
      };
    })
  );

  // Group posts by angle
  const postsByAngle = POST_ANGLES.reduce<PostsByAngle>((acc, angle) => {
    acc[angle] = postsWithIntents.filter(p => p.postType === angle)
      .sort((a, b) => (a.versionNumber ?? 0) - (b.versionNumber ?? 0));
    return acc;
  }, {} as PostsByAngle);

  // Group articles by angle
  const articlesByAngle = ARTICLE_ANGLES.reduce<ArticlesByAngle>((acc, angle) => {
    acc[angle] = articlesWithIntents.filter(a => a.articleType === angle)
      .sort((a, b) => (a.versionNumber ?? 0) - (b.versionNumber ?? 0));
    return acc;
  }, {} as ArticlesByAngle);

  // Count stats
  const approvedPostsCount = postsWithIntents.filter(p => p.approved).length;
  const approvedArticlesCount = articlesWithIntents.filter(a => a.approved).length;
  const anglesWithPosts = POST_ANGLES.filter(a => postsByAngle[a].length > 0);
  const anglesWithArticles = ARTICLE_ANGLES.filter(a => articlesByAngle[a].length > 0);

  // Prepare posts data for client wrapper
  const postsForClient = postsWithIntents.map((p) => ({
    id: p.id,
    hook: p.hook,
    bodyBeats: [] as string[], // Not needed for keyboard nav
    openQuestion: "",
    postType: p.postType,
    fullText: p.fullText,
    approved: p.approved,
  }));

  return (
    <ResultsClientWrapper posts={postsForClient} runLabel={run.sourceLabel}>
      <ToastContainer />
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
            <Link href="/" className="font-bold text-lg gradient-text">LinWheel</Link>
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
                  {posts.length > 0 && <span>{posts.length} posts</span>}
                  {posts.length > 0 && articleRecords.length > 0 && " • "}
                  {articleRecords.length > 0 && <span>{articleRecords.length} articles</span>}
                  {" • "}
                  {approvedPostsCount + approvedArticlesCount} approved • {formatDate(run.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={run.status} />
                <DeleteRunButton runId={runId} redirectAfter />
              </div>
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
                      : `Generating content${anglesWithPosts.length > 0 ? ` (${anglesWithPosts.length} post angles)` : ""}${anglesWithArticles.length > 0 ? ` + ${anglesWithArticles.length} article angles` : ""}... This may take a few minutes.`}
                  </span>
                </div>
              </div>
            )}

            {run.status === "failed" && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="text-red-700 dark:text-red-400">
                    <p className="font-medium">Generation failed</p>
                    <p className="text-sm mt-1">{run.error || "Unknown error"}</p>
                  </div>
                  <RetryButton runId={runId} />
                </div>
              </div>
            )}

            {/* Collapsible original transcript */}
            {run.transcript && (
              <details className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
                <summary className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 list-none flex justify-between items-center">
                  <span className="font-medium">Original Input</span>
                  <span className="text-sm text-neutral-500">
                    {run.transcript.length.toLocaleString()} characters
                  </span>
                </summary>
                <div className="p-4 max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-400 font-sans">
                    {run.transcript}
                  </pre>
                </div>
              </details>
            )}
          </div>

          {/* Content tabs (Posts / Articles) */}
          <ContentTabs
            postCount={posts.length}
            articleCount={articleRecords.length}
            postsContent={
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
            }
            articlesContent={
              <div className="space-y-8">
                {anglesWithArticles.map((angle) => (
                  <ArticleBucket
                    key={angle}
                    angle={angle}
                    articles={articlesByAngle[angle]}
                    runId={runId}
                  />
                ))}
              </div>
            }
          />
        </div>
      </main>
      </div>
    </ResultsClientWrapper>
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
    <details className="group border border-indigo-200/70 dark:border-indigo-800/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300" open>
      {/* Gradient slice bar at top */}
      <div className="h-1 w-full bg-gradient-to-r from-indigo-400 via-violet-500 to-indigo-400" />

      <summary className="px-6 py-5 bg-gradient-to-r from-indigo-50/80 via-slate-50/50 to-indigo-50/80 dark:from-indigo-950/40 dark:via-slate-900/50 dark:to-indigo-950/40 cursor-pointer hover:from-indigo-100/80 hover:via-slate-100/50 hover:to-indigo-100/80 dark:hover:from-indigo-950/60 dark:hover:via-slate-800/50 dark:hover:to-indigo-950/60 list-none transition-all duration-300">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-xl">📝</span>
            <span className="text-lg font-bold capitalize bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-violet-600 dark:from-indigo-300 dark:to-violet-400">
              {angle.replace("_", " ")}
            </span>
            <span className="text-sm text-indigo-500 dark:text-indigo-400 hidden sm:inline">
              {ANGLE_DESCRIPTIONS[angle]}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <GenerateMoreButton runId={runId} angle={angle} />
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                {posts.length} version{posts.length !== 1 ? "s" : ""}
              </span>
              {approvedCount > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm">
                  {approvedCount} approved
                </span>
              )}
            </div>
            <span className="text-indigo-400 group-open:rotate-180 transition-transform duration-300">
              ▼
            </span>
          </div>
        </div>
      </summary>

      <div className="p-6 bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-900 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} runId={runId} />
        ))}
      </div>
    </details>
  );
}

function ArticleBucket({
  angle,
  articles,
  runId,
}: {
  angle: ArticleAngle;
  articles: ArticleWithIntent[];
  runId: string;
}) {
  const approvedCount = articles.filter(a => a.approved).length;

  return (
    <details className="group border border-blue-200/70 dark:border-blue-800/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300" open>
      {/* Gradient slice bar at top */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-400" />

      <summary className="px-6 py-5 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-blue-50/80 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/40 cursor-pointer hover:from-blue-100/80 hover:via-indigo-100/50 hover:to-blue-100/80 dark:hover:from-blue-950/60 dark:hover:via-indigo-950/40 dark:hover:to-blue-950/60 list-none transition-all duration-300">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-xl">📄</span>
            <span className="text-lg font-bold capitalize bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600 dark:from-blue-300 dark:to-indigo-400">
              {angle.replace("_", " ")}
            </span>
            <span className="text-sm text-blue-600 dark:text-blue-400 hidden sm:inline">
              {ARTICLE_ANGLE_DESCRIPTIONS[angle]}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <GenerateMoreArticlesButton runId={runId} angle={angle} />
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                {articles.length} version{articles.length !== 1 ? "s" : ""}
              </span>
              {approvedCount > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm">
                  {approvedCount} approved
                </span>
              )}
            </div>
            <span className="text-blue-400 group-open:rotate-180 transition-transform duration-300">
              ▼
            </span>
          </div>
        </div>
      </summary>

      <div className="p-6 bg-gradient-to-b from-blue-50/30 to-white dark:from-blue-950/20 dark:to-slate-900 grid gap-5 md:grid-cols-2">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} runId={runId} />
        ))}
      </div>
    </details>
  );
}

function StatusBadge({ status }: { status: string }) {
  const baseStyles: Record<string, string> = {
    pending: "bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-500/30",
    processing: "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30",
    complete: "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30",
    failed: "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/30",
  };

  const isActive = status === "pending" || status === "processing";

  return (
    <span className="relative inline-flex">
      {/* Pulsing glow for active states */}
      {isActive && (
        <span
          className={`absolute inset-0 rounded-full animate-ping opacity-40 ${
            status === "pending"
              ? "bg-yellow-400"
              : "bg-blue-500"
          }`}
          style={{ animationDuration: "1.5s" }}
        />
      )}
      <span
        className={`relative px-3.5 py-1.5 text-sm font-bold rounded-full ${baseStyles[status] || baseStyles.pending} ${
          isActive ? "animate-pulse" : ""
        }`}
        style={isActive ? { animationDuration: "2s" } : undefined}
      >
        <span className="flex items-center gap-1.5">
          {status === "processing" && (
            <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDuration: "0.6s" }} />
          )}
          {status === "pending" && (
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          )}
          {status === "complete" && (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
          {status === "failed" && (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
          {status}
        </span>
      </span>
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
