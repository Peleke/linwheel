import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { generationRuns, linkedinPosts, articles, imageIntents, articleImageIntents } from "@/db/schema";
import { desc, eq, and, isNotNull } from "drizzle-orm";
import { ClearRunsButton } from "@/components/clear-runs-button";
import { DeleteRunButton } from "@/components/delete-run-button";
import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Fetch preview images for a run (up to 4)
async function getRunPreviewImages(runId: string): Promise<string[]> {
  const images: string[] = [];

  // Get post images
  const postImages = await db
    .select({ url: imageIntents.generatedImageUrl })
    .from(imageIntents)
    .innerJoin(linkedinPosts, eq(imageIntents.postId, linkedinPosts.id))
    .where(
      and(
        eq(linkedinPosts.runId, runId),
        eq(linkedinPosts.approved, true),
        isNotNull(imageIntents.generatedImageUrl)
      )
    )
    .limit(4);

  images.push(...postImages.map(p => p.url!).filter(Boolean));

  // If we need more, get article images
  if (images.length < 4) {
    const articleImages = await db
      .select({ url: articleImageIntents.generatedImageUrl })
      .from(articleImageIntents)
      .innerJoin(articles, eq(articleImageIntents.articleId, articles.id))
      .where(
        and(
          eq(articles.runId, runId),
          eq(articles.approved, true),
          isNotNull(articleImageIntents.generatedImageUrl)
        )
      )
      .limit(4 - images.length);

    images.push(...articleImages.map(a => a.url!).filter(Boolean));
  }

  return images;
}

// Get stats for a run
async function getRunStats(runId: string) {
  const [approvedPosts, approvedArticles] = await Promise.all([
    db.select().from(linkedinPosts).where(and(eq(linkedinPosts.runId, runId), eq(linkedinPosts.approved, true))),
    db.select().from(articles).where(and(eq(articles.runId, runId), eq(articles.approved, true))),
  ]);

  return {
    approvedPosts: approvedPosts.length,
    approvedArticles: approvedArticles.length,
  };
}

export default async function ResultsListPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirect=/results");
  }

  const runs = await db.query.generationRuns.findMany({
    where: eq(generationRuns.userId, user.id),
    orderBy: [desc(generationRuns.createdAt)],
  });

  // Fetch preview images and stats for each run
  const runsWithData = await Promise.all(
    runs.map(async (run) => ({
      ...run,
      previewImages: await getRunPreviewImages(run.id),
      stats: await getRunStats(run.id),
    }))
  );

  // Calculate totals
  const totalPosts = runs.reduce((acc, r) => acc + (r.postCount ?? 0), 0);
  const totalApproved = runsWithData.reduce((acc, r) => acc + r.stats.approvedPosts + r.stats.approvedArticles, 0);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-800 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />

          {/* Floating orbs - more subtle */}
          <div className="absolute top-10 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-10 w-96 h-96 bg-zinc-500/10 rounded-full blur-3xl" />

          <div className="relative max-w-6xl mx-auto px-6 py-16">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm mb-4">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {runs.length} generation{runs.length !== 1 ? 's' : ''}
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                  Your Content Library
                </h1>
                <p className="text-lg text-white/80 max-w-xl">
                  Browse, manage, and publish your AI-generated LinkedIn content.
                </p>
              </div>

              {/* Stats Cards */}
              {runs.length > 0 && (
                <div className="flex gap-4">
                  <div className="px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                    <p className="text-3xl font-bold text-white">{totalPosts}</p>
                    <p className="text-sm text-white/70">Total Posts</p>
                  </div>
                  <div className="px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                    <p className="text-3xl font-bold text-emerald-300">{totalApproved}</p>
                    <p className="text-sm text-white/70">Approved</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-6 py-10">
          {runs.length > 0 && (
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <Link
                  href="/generate"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  New Generation
                </Link>
              </div>
              <ClearRunsButton runCount={runs.length} />
            </div>
          )}

          {runs.length === 0 ? (
            <div className="text-center py-20 rounded-3xl bg-white dark:bg-zinc-900 shadow-xl shadow-zinc-200/50 dark:shadow-none border border-zinc-100 dark:border-zinc-800">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-zinc-800 dark:bg-zinc-700 flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                Start Creating Magic
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-8 max-w-md mx-auto">
                Transform your ideas into engaging LinkedIn content with AI. Paste a transcript, article, or notes to begin.
              </p>
              <Link
                href="/generate"
                className="inline-flex items-center gap-2 px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-xl hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Generate Your First Post
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {runsWithData.map((run, index) => (
                <Link
                  key={run.id}
                  href={`/results/${run.id}`}
                  className={`group relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-lg shadow-zinc-200/50 dark:shadow-none border border-zinc-100 dark:border-zinc-800 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 ${
                    index === 0 ? 'md:col-span-2 lg:col-span-2' : ''
                  }`}
                >
                  {/* Image Preview Grid */}
                  {run.previewImages.length > 0 ? (
                    <div className={`relative ${index === 0 ? 'h-48' : 'h-36'} overflow-hidden bg-zinc-100 dark:bg-zinc-800`}>
                      <div className={`absolute inset-0 grid ${
                        run.previewImages.length === 1 ? 'grid-cols-1' :
                        run.previewImages.length === 2 ? 'grid-cols-2' :
                        run.previewImages.length === 3 ? 'grid-cols-3' :
                        'grid-cols-2 grid-rows-2'
                      } gap-0.5`}>
                        {run.previewImages.slice(0, 4).map((url, i) => (
                          <div key={i} className="relative overflow-hidden">
                            <Image
                              src={url}
                              alt=""
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                              sizes="300px"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                      {/* Status badge overlay */}
                      <div className="absolute top-3 right-3">
                        <StatusBadge status={run.status} />
                      </div>

                      {/* Approved count overlay */}
                      {(run.stats.approvedPosts + run.stats.approvedArticles) > 0 && (
                        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-medium">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {run.stats.approvedPosts + run.stats.approvedArticles} approved
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`relative ${index === 0 ? 'h-32' : 'h-24'} overflow-hidden`}>
                      <div className={`absolute inset-0 ${
                        run.status === 'complete'
                          ? 'bg-gradient-to-br from-emerald-400 to-cyan-500'
                          : run.status === 'processing'
                            ? 'bg-gradient-to-br from-blue-400 to-violet-500'
                            : run.status === 'failed'
                              ? 'bg-gradient-to-br from-red-400 to-rose-500'
                              : 'bg-gradient-to-br from-amber-400 to-orange-500'
                      }`} />
                      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-30" />
                      <div className="absolute top-3 right-3">
                        <StatusBadge status={run.status} />
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {run.sourceLabel}
                      </h3>
                      <DeleteRunButton runId={run.id} />
                    </div>

                    <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        {run.postCount ?? 0} posts
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDate(run.createdAt)}
                      </span>
                    </div>

                    {run.selectedAngles && run.selectedAngles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {run.selectedAngles.slice(0, 3).map((angle) => (
                          <span key={angle} className="px-2 py-0.5 text-xs rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            {angle.replace('_', ' ')}
                          </span>
                        ))}
                        {run.selectedAngles.length > 3 && (
                          <span className="px-2 py-0.5 text-xs rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            +{run.selectedAngles.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {run.error && (
                      <p className="mt-3 text-sm text-red-600 dark:text-red-400 line-clamp-2">
                        {run.error}
                      </p>
                    )}
                  </div>

                  {/* Hover arrow */}
                  <div className="absolute bottom-5 right-5 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400",
    processing: "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400",
    complete: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
    failed: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400",
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${styles[status] || styles.pending}`}>
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
