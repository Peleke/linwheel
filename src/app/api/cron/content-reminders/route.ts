import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { linkedinPosts, articles, pushSubscriptions, publishingStatus, generationRuns } from "@/db/schema";
import { eq, and, gte, lte, isNotNull } from "drizzle-orm";
import { sendContentReminder } from "@/lib/push";
import { nanoid } from "nanoid";

/**
 * GET /api/cron/content-reminders
 *
 * Cron job to send push notifications for content scheduled
 * within the next 15 minutes. Run every 5 minutes.
 *
 * Authorization: Bearer {CRON_SECRET}
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "dev-secret-change-in-production";

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log("[Cron] Unauthorized content reminder request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting content reminder job");

    const now = new Date();
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

    // Find posts scheduled within the reminder window (using SQL join)
    const scheduledPostsWithRuns = await db
      .select({
        post: linkedinPosts,
        run: generationRuns,
      })
      .from(linkedinPosts)
      .innerJoin(generationRuns, eq(linkedinPosts.runId, generationRuns.id))
      .where(
        and(
          isNotNull(linkedinPosts.scheduledAt),
          eq(linkedinPosts.approved, true),
          gte(linkedinPosts.scheduledAt, now),
          lte(linkedinPosts.scheduledAt, fifteenMinutesFromNow)
        )
      );

    // Find articles scheduled within the reminder window
    const scheduledArticlesWithRuns = await db
      .select({
        article: articles,
        run: generationRuns,
      })
      .from(articles)
      .innerJoin(generationRuns, eq(articles.runId, generationRuns.id))
      .where(
        and(
          isNotNull(articles.scheduledAt),
          eq(articles.approved, true),
          gte(articles.scheduledAt, now),
          lte(articles.scheduledAt, fifteenMinutesFromNow)
        )
      );

    console.log(`[Cron] Found ${scheduledPostsWithRuns.length} posts and ${scheduledArticlesWithRuns.length} articles to remind`);

    if (scheduledPostsWithRuns.length === 0 && scheduledArticlesWithRuns.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No content to remind about",
        timestamp: new Date().toISOString(),
      });
    }

    // Group content by user (via their generation runs)
    const contentByUser = new Map<string, Array<{
      type: "post" | "article";
      id: string;
      title: string;
      scheduledAt: Date;
    }>>();

    for (const { post, run } of scheduledPostsWithRuns) {
      if (!run.userId || !post.scheduledAt) continue;

      // Check if we already sent a reminder for this content
      const existingReminder = await db.query.publishingStatus.findFirst({
        where: and(
          eq(publishingStatus.contentType, "post"),
          eq(publishingStatus.contentId, post.id),
          isNotNull(publishingStatus.reminderSentAt)
        ),
      });

      if (existingReminder) continue;

      const userId = run.userId;
      if (!contentByUser.has(userId)) {
        contentByUser.set(userId, []);
      }
      contentByUser.get(userId)!.push({
        type: "post",
        id: post.id,
        title: post.fullText.slice(0, 60),
        scheduledAt: post.scheduledAt,
      });
    }

    for (const { article, run } of scheduledArticlesWithRuns) {
      if (!run.userId || !article.scheduledAt) continue;

      // Check if we already sent a reminder
      const existingReminder = await db.query.publishingStatus.findFirst({
        where: and(
          eq(publishingStatus.contentType, "article"),
          eq(publishingStatus.contentId, article.id),
          isNotNull(publishingStatus.reminderSentAt)
        ),
      });

      if (existingReminder) continue;

      const userId = run.userId;
      if (!contentByUser.has(userId)) {
        contentByUser.set(userId, []);
      }
      contentByUser.get(userId)!.push({
        type: "article",
        id: article.id,
        title: article.title,
        scheduledAt: article.scheduledAt,
      });
    }

    // Send notifications to each user
    const results: Array<{
      userId: string;
      contentCount: number;
      notificationsSent: number;
      errors: string[];
    }> = [];

    for (const [userId, contentItems] of contentByUser) {
      // Get user's push subscriptions
      const subscriptions = await db.query.pushSubscriptions.findMany({
        where: eq(pushSubscriptions.userId, userId),
      });

      if (subscriptions.length === 0) {
        results.push({
          userId,
          contentCount: contentItems.length,
          notificationsSent: 0,
          errors: ["No push subscriptions"],
        });
        continue;
      }

      let sent = 0;
      const errors: string[] = [];

      for (const content of contentItems) {
        for (const sub of subscriptions) {
          const result = await sendContentReminder(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            {
              type: content.type,
              title: content.title,
              scheduledAt: content.scheduledAt,
              contentId: content.id,
            }
          );

          if (result.success) {
            sent++;
          } else if (result.error) {
            errors.push(result.error);
          }
        }

        // Mark reminder as sent
        await db.insert(publishingStatus).values({
          id: nanoid(),
          contentType: content.type,
          contentId: content.id,
          reminderSentAt: new Date(),
        });
      }

      results.push({
        userId,
        contentCount: contentItems.length,
        notificationsSent: sent,
        errors,
      });
    }

    console.log("[Cron] Content reminders sent:", JSON.stringify(results, null, 2));

    return NextResponse.json({
      success: true,
      message: "Content reminders processed",
      stats: {
        usersNotified: results.filter(r => r.notificationsSent > 0).length,
        totalNotifications: results.reduce((sum, r) => sum + r.notificationsSent, 0),
        contentProcessed: results.reduce((sum, r) => sum + r.contentCount, 0),
      },
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Error in content reminders:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
