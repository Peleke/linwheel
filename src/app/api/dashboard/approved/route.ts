import { NextResponse } from "next/server";
import { db } from "@/db";
import { linkedinPosts, articles, imageIntents, articleImageIntents, generationRuns } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/dashboard/approved
 *
 * Returns all approved content across all runs for the dashboard
 */
export async function GET() {
  try {
    // Fetch all approved posts with their image intents and run info
    const approvedPosts = await db.query.linkedinPosts.findMany({
      where: eq(linkedinPosts.approved, true),
    });

    const postsWithDetails = await Promise.all(
      approvedPosts.map(async (post) => {
        const [intent, run] = await Promise.all([
          db.query.imageIntents.findFirst({
            where: eq(imageIntents.postId, post.id),
          }),
          db.query.generationRuns.findFirst({
            where: eq(generationRuns.id, post.runId),
          }),
        ]);

        return {
          id: post.id,
          type: "post" as const,
          title: post.hook,
          fullText: post.fullText,
          contentType: post.postType,
          scheduledAt: post.scheduledAt,
          scheduledPosition: post.scheduledPosition,
          imageUrl: intent?.generatedImageUrl || null,
          runId: post.runId,
          runLabel: run?.sourceLabel || "Unknown",
          createdAt: run?.createdAt || null,
        };
      })
    );

    // Fetch all approved articles with their image intents and run info
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
          scheduledAt: article.scheduledAt,
          scheduledPosition: article.scheduledPosition,
          imageUrl: intent?.generatedImageUrl || null,
          runId: article.runId,
          runLabel: run?.sourceLabel || "Unknown",
          createdAt: run?.createdAt || null,
        };
      })
    );

    // Combine and sort by scheduled date (scheduled first), then by creation date
    const allContent = [...postsWithDetails, ...articlesWithDetails].sort((a, b) => {
      // Scheduled items first
      if (a.scheduledAt && !b.scheduledAt) return -1;
      if (!a.scheduledAt && b.scheduledAt) return 1;
      // Then by scheduled date
      if (a.scheduledAt && b.scheduledAt) {
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      }
      // Then by creation date (newest first)
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

    // Group by schedule status
    const scheduled = allContent.filter(c => c.scheduledAt);
    const unscheduled = allContent.filter(c => !c.scheduledAt);

    return NextResponse.json({
      total: allContent.length,
      scheduled: scheduled.length,
      unscheduled: unscheduled.length,
      content: allContent,
      // For calendar view - group by date
      byDate: groupByDate(scheduled),
    });
  } catch (error) {
    console.error("Error fetching approved content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function groupByDate(items: { scheduledAt: Date | null }[]) {
  const groups: Record<string, typeof items> = {};

  for (const item of items) {
    if (!item.scheduledAt) continue;
    const dateKey = new Date(item.scheduledAt).toISOString().split("T")[0];
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(item);
  }

  return groups;
}
