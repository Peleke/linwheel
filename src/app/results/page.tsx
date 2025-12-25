import Link from "next/link";
import { db } from "@/db";
import { generationRuns } from "@/db/schema";
import { desc } from "drizzle-orm";
import { ClearRunsButton } from "@/components/clear-runs-button";
import { DeleteRunButton } from "@/components/delete-run-button";
import { AppHeader } from "@/components/app-header";

export const dynamic = "force-dynamic";

export default async function ResultsListPage() {
  // Fetch all runs, most recent first
  const runs = await db.query.generationRuns.findMany({
    orderBy: [desc(generationRuns.createdAt)],
  });

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-2xl font-bold">Your Generations</h1>
            <ClearRunsButton runCount={runs.length} />
          </div>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8">
            Browse and manage your generated LinkedIn posts.
          </p>

          {runs.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl">
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                No generations yet. Start by pasting a transcript.
              </p>
              <Link
                href="/generate"
                className="inline-flex px-6 py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
              >
                Generate posts
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <Link href={`/results/${run.id}`} className="font-semibold text-lg line-clamp-1 hover:underline">
                      {run.sourceLabel}
                    </Link>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={run.status} />
                      <DeleteRunButton runId={run.id} />
                    </div>
                  </div>

                  <Link href={`/results/${run.id}`} className="block">
                    <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                      <p>
                        {run.postCount ?? 0} posts generated
                      </p>
                      <p>
                        {formatDate(run.createdAt)}
                      </p>
                      {run.selectedAngles && run.selectedAngles.length > 0 && (
                        <p className="text-xs">
                          Angles: {run.selectedAngles.join(", ")}
                        </p>
                      )}
                    </div>

                    {run.error && (
                      <p className="mt-3 text-sm text-red-600 dark:text-red-400 line-clamp-2">
                        {run.error}
                      </p>
                    )}
                  </Link>
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
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    complete: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.pending}`}>
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
