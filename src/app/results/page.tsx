import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { generationRuns } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ClearRunsButton } from "@/components/clear-runs-button";
import { DeleteRunButton } from "@/components/delete-run-button";
import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ResultsListPage() {
  // Get current user
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirect=/results");
  }

  // Fetch runs for this user, most recent first
  const runs = await db.query.generationRuns.findMany({
    where: eq(generationRuns.userId, user.id),
    orderBy: [desc(generationRuns.createdAt)],
  });

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Your Generations</h1>
            <ClearRunsButton runCount={runs.length} />
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            Browse and manage your generated LinkedIn posts.
          </p>

          {runs.length === 0 ? (
            <div className="text-center py-16 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-sky-500 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                No generations yet. Start by pasting a transcript.
              </p>
              <Link
                href="/generate"
                className="inline-flex px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-lg shadow-zinc-900/10 dark:shadow-white/10"
              >
                Generate posts
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="group relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {/* Accent ribbon at top */}
                  <div className={`h-1 w-full ${
                    run.status === 'complete'
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                      : run.status === 'processing'
                        ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                        : run.status === 'failed'
                          ? 'bg-gradient-to-r from-red-400 to-red-500'
                          : 'bg-gradient-to-r from-amber-400 to-amber-500'
                  }`} />

                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <Link href={`/results/${run.id}`} className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 line-clamp-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        {run.sourceLabel}
                      </Link>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={run.status} />
                        <DeleteRunButton runId={run.id} />
                      </div>
                    </div>

                    <Link href={`/results/${run.id}`} className="block">
                      <div className="text-sm text-zinc-500 dark:text-zinc-400 space-y-1">
                        <p className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          {run.postCount ?? 0} posts generated
                        </p>
                        <p className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDate(run.createdAt)}
                        </p>
                        {run.selectedAngles && run.selectedAngles.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {run.selectedAngles.slice(0, 3).map((angle) => (
                              <span key={angle} className="px-2 py-0.5 text-xs rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                {angle.replace('_', ' ')}
                              </span>
                            ))}
                            {run.selectedAngles.length > 3 && (
                              <span className="px-2 py-0.5 text-xs rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-500">
                                +{run.selectedAngles.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {run.error && (
                        <p className="mt-3 text-sm text-red-600 dark:text-red-400 line-clamp-2">
                          {run.error}
                        </p>
                      )}
                    </Link>
                  </div>
                </div>
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
