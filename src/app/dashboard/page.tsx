import { db } from "@/db";
import { linkedinPosts, articles, imageIntents, articleImageIntents, generationRuns } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppHeader } from "@/components/app-header";
import { DashboardClient } from "@/components/dashboard-client";

export const dynamic = "force-dynamic";

// Safe date to ISO string conversion
function safeToISOString(date: Date | null | undefined): string | null {
  if (!date) return null;
  try {
    const iso = date.toISOString();
    // Check if it's a valid date string
    if (iso === "Invalid Date" || isNaN(date.getTime())) return null;
    return iso;
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  // Fetch all approved posts
  const approvedPosts = await db.query.linkedinPosts.findMany({
    where: eq(linkedinPosts.approved, true),
  });

  // Debug: Log counts for Vercel
  console.log(`[Dashboard] Found ${approvedPosts.length} approved posts`);
  if (approvedPosts.length > 0) {
    console.log(`[Dashboard] Sample post:`, {
      id: approvedPosts[0].id,
      approved: approvedPosts[0].approved,
      scheduledAt: approvedPosts[0].scheduledAt,
      linkedinPostUrn: approvedPosts[0].linkedinPostUrn,
    });
  }

  const postsWithDetails = await Promise.all(
    approvedPosts.map(async (post) => {
      const [intent, run] = await Promise.all([
        db.query.imageIntents.findFirst({
          where: eq(imageIntents.postId, post.id),
        }),
        post.runId
          ? db.query.generationRuns.findFirst({
              where: eq(generationRuns.id, post.runId),
            })
          : null,
      ]);

      return {
        id: post.id,
        type: "post" as const,
        title: post.hook,
        fullText: post.fullText,
        contentType: post.postType,
        scheduledAt: safeToISOString(post.scheduledAt),
        imageUrl: intent?.generatedImageUrl || null,
        runId: post.runId || "",
        runLabel: run?.sourceLabel || "Unknown",
        linkedinPostUrn: post.linkedinPostUrn || null,
        autoPublish: post.autoPublish ?? true,
      };
    })
  );

  // Fetch all approved articles
  const approvedArticles = await db.query.articles.findMany({
    where: eq(articles.approved, true),
  });

  const articlesWithDetails = await Promise.all(
    approvedArticles.map(async (article) => {
      const [intent, run] = await Promise.all([
        db.query.articleImageIntents.findFirst({
          where: eq(articleImageIntents.articleId, article.id),
        }),
        db.query.generationRuns.findFirst({
          where: eq(generationRuns.id, article.runId),
        }),
      ]);

      return {
        id: article.id,
        type: "article" as const,
        title: article.title,
        fullText: article.fullText,
        contentType: article.articleType,
        scheduledAt: safeToISOString(article.scheduledAt),
        imageUrl: intent?.generatedImageUrl || null,
        runId: article.runId,
        runLabel: run?.sourceLabel || "Unknown",
        linkedinPostUrn: null, // Articles don't have direct LinkedIn publishing yet
        autoPublish: true,
      };
    })
  );

  const allContent = [...postsWithDetails, ...articlesWithDetails];

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <DashboardClient content={allContent} />
        </div>
      </main>
    </div>
  );
}
