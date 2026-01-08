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
import { AppHeader } from "@/components/app-header";
import { ApprovedContentPanel } from "@/components/approved-content-panel";

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
  scheduledAt?: Date | null;
  imageIntent?: {
    id: string;
    headlineText: string;
    prompt: string;
    negativePrompt: string;
    stylePreset: string;
    generatedImageUrl?: string | null;
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
  scheduledAt?: Date | null;
  imageIntent?: {
    id: string;
    headlineText: string;
    prompt: string;
    negativePrompt: string;
    stylePreset: string;
    generatedImageUrl?: string | null;
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
        scheduledAt: post.scheduledAt,
        imageIntent: intent ? {
          id: intent.id,
          headlineText: intent.headlineText,
          prompt: intent.prompt,
          negativePrompt: intent.negativePrompt,
          stylePreset: intent.stylePreset,
          generatedImageUrl: intent.generatedImageUrl,
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
        scheduledAt: article.scheduledAt,
        imageIntent: intent ? {
          id: intent.id,
          headlineText: intent.headlineText,
          prompt: intent.prompt,
          negativePrompt: intent.negativePrompt,
          stylePreset: intent.stylePreset,
          generatedImageUrl: intent.generatedImageUrl,
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
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
        <AppHeader />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-8 py-12">
          {/* Run header */}
          <div className="mb-10">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-100 truncate">{run.sourceLabel}</h1>
                <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                  {posts.length > 0 && <span>{posts.length} posts</span>}
                  {posts.length > 0 && articleRecords.length > 0 && " • "}
                  {articleRecords.length > 0 && <span>{articleRecords.length} articles</span>}
                  {" • "}
                  {approvedPostsCount + approvedArticlesCount} approved • {formatDate(run.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <StatusBadge status={run.status} />
                <DeleteRunButton runId={runId} redirectAfter />
              </div>
            </div>

            {/* Status poller for pending/processing runs - progressive rendering */}
            <StatusPoller
              runId={runId}
              status={run.status}
              postCount={posts.length}
              articleCount={articleRecords.length}
              createdAt={run.createdAt}
            />

            {(run.status === "pending" || run.status === "processing") && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                    </div>
                    <div>
                      <span className="text-blue-700 dark:text-blue-300 font-medium">
                        {run.status === "pending"
                          ? "Starting generation..."
                          : "Generating content..."}
                      </span>
                      <p className="text-blue-600/70 dark:text-blue-400/70 text-sm">
                        Content appears as it&apos;s ready
                      </p>
                    </div>
                  </div>
                  {run.status === "processing" && (posts.length > 0 || articleRecords.length > 0) && (
                    <div className="flex items-center gap-3 text-sm">
                      {posts.length > 0 && (
                        <span className="px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                          {posts.length} post{posts.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      {articleRecords.length > 0 && (
                        <span className="px-2.5 py-1 rounded-md bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-medium">
                          {articleRecords.length} article{articleRecords.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  )}
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

            {/* Empty state: completed but no content generated */}
            {run.status === "complete" && posts.length === 0 && articleRecords.length === 0 && (
              <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">🔍</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">
                      No insights found in this content
                    </h3>
                    <p className="text-amber-700 dark:text-amber-400 text-sm mb-4">
                      The AI couldn&apos;t extract any actionable insights from the provided transcript.
                      This can happen when the content is too short, too general, or lacks specific
                      claims or observations that would make compelling LinkedIn posts.
                    </p>
                    <div className="text-amber-600 dark:text-amber-500 text-sm space-y-2">
                      <p className="font-medium">Tips for better results:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Use longer, more detailed transcripts (5+ minutes of conversation)</li>
                        <li>Ensure the content includes specific claims, opinions, or insights</li>
                        <li>Include real examples, data points, or contrarian takes</li>
                        <li>Conversations with back-and-forth discussion work best</li>
                      </ul>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <Link
                        href="/generate"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Try with different content
                      </Link>
                      <RetryButton runId={runId} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Collapsible original transcript */}
            {run.transcript && (
              <details className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                <summary className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 list-none flex justify-between items-center">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">Original Input</span>
                  <span className="text-sm text-zinc-500">
                    {run.transcript.length.toLocaleString()} characters
                  </span>
                </summary>
                <div className="p-4 max-h-64 overflow-y-auto bg-white dark:bg-zinc-900">
                  <pre className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400 font-sans">
                    {run.transcript}
                  </pre>
                </div>
              </details>
            )}
          </div>

          {/* Approved content panel - lifted to top for easy access */}
          <ApprovedContentPanel
            posts={postsWithIntents
              .filter(p => p.approved)
              .map(p => ({
                id: p.id,
                hook: p.hook,
                fullText: p.fullText,
                postType: p.postType,
                scheduledAt: p.scheduledAt,
                imageUrl: p.imageIntent?.generatedImageUrl,
              }))}
            articles={articlesWithIntents
              .filter(a => a.approved)
              .map(a => ({
                id: a.id,
                title: a.title,
                fullText: a.fullText,
                articleType: a.articleType,
                scheduledAt: a.scheduledAt,
                imageUrl: a.imageIntent?.generatedImageUrl,
              }))}
            runId={runId}
          />

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
    <details className="group rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm" open>
      {/* Accent ribbon at top */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-400 to-blue-500" />

      <summary className="px-5 py-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 list-none transition-colors">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/20 flex-shrink-0">
              <span className="text-sm">📝</span>
            </div>
            <div className="min-w-0">
              <span className="text-base font-semibold capitalize text-zinc-900 dark:text-zinc-100 block truncate">
                {angle.replace("_", " ")}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 hidden lg:block">
                {ANGLE_DESCRIPTIONS[angle]}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 flex-shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
                {posts.length} ver{posts.length !== 1 ? "s" : ""}
              </span>
              {approvedCount > 0 && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500 text-white shadow-sm shadow-emerald-500/20">
                  {approvedCount}✓
                </span>
              )}
            </div>
            <div className="hidden sm:block">
              <GenerateMoreButton runId={runId} angle={angle} />
            </div>
            <span className="text-zinc-400 group-open:rotate-180 transition-transform flex-shrink-0">
              ▼
            </span>
          </div>
        </div>
      </summary>

      <div className="p-5 bg-zinc-50 dark:bg-zinc-950">
        <div className="sm:hidden mb-4">
          <GenerateMoreButton runId={runId} angle={angle} />
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} runId={runId} />
          ))}
        </div>
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
    <details className="group rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm" open>
      {/* Accent ribbon at top */}
      <div className="h-1 w-full bg-gradient-to-r from-sky-400 to-sky-500" />

      <summary className="px-5 py-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 list-none transition-colors">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-sm shadow-sky-500/20 flex-shrink-0">
              <span className="text-sm">📄</span>
            </div>
            <div className="min-w-0">
              <span className="text-base font-semibold capitalize text-zinc-900 dark:text-zinc-100 block truncate">
                {angle.replace("_", " ")}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 hidden lg:block">
                {ARTICLE_ANGLE_DESCRIPTIONS[angle]}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 flex-shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300">
                {articles.length} ver{articles.length !== 1 ? "s" : ""}
              </span>
              {approvedCount > 0 && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500 text-white shadow-sm shadow-emerald-500/20">
                  {approvedCount}✓
                </span>
              )}
            </div>
            <div className="hidden sm:block">
              <GenerateMoreArticlesButton runId={runId} angle={angle} />
            </div>
            <span className="text-zinc-400 group-open:rotate-180 transition-transform flex-shrink-0">
              ▼
            </span>
          </div>
        </div>
      </summary>

      <div className="p-5 bg-zinc-50 dark:bg-zinc-950">
        <div className="sm:hidden mb-4">
          <GenerateMoreArticlesButton runId={runId} angle={angle} />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} runId={runId} />
          ))}
        </div>
      </div>
    </details>
  );
}

function StatusBadge({ status }: { status: string }) {
  const baseStyles: Record<string, string> = {
    pending: "bg-amber-500 text-white",
    processing: "bg-blue-500 text-white",
    complete: "bg-emerald-500 text-white",
    failed: "bg-red-500 text-white",
  };

  return (
    <span
      className={`px-3 py-1.5 text-sm font-medium rounded-md ${baseStyles[status] || baseStyles.pending}`}
    >
      <span className="flex items-center gap-1.5">
        {status === "processing" && (
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
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
