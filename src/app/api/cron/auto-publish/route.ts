/**
 * GET /api/cron/auto-publish
 *
 * Cron job to auto-publish scheduled posts to LinkedIn.
 * Runs every 5 minutes. Publishes posts where:
 * - autoPublish is true
 * - scheduledAt has passed
 * - not yet published (no linkedinPostUrn)
 *
 * Authorization: Bearer {CRON_SECRET}
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  linkedinPosts,
  linkedinConnections,
  pushSubscriptions,
  imageIntents,
  generationRuns,
} from "@/db/schema";
import { eq, and, lte, isNotNull, isNull } from "drizzle-orm";
import { decryptToken } from "@/lib/crypto";
import { LinkedInClient, LinkedInError } from "@/lib/linkedin";
import { sendPostPublishedNotification } from "@/lib/push";

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "dev-secret-change-in-production";

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log("[AutoPublish] Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[AutoPublish] Starting auto-publish job");

    const now = new Date();

    // Find posts ready for auto-publish
    // - approved, autoPublish = true, scheduledAt <= now, not yet published
    const postsToPublish = await db
      .select({
        post: linkedinPosts,
        run: generationRuns,
      })
      .from(linkedinPosts)
      .leftJoin(generationRuns, eq(linkedinPosts.runId, generationRuns.id))
      .where(
        and(
          eq(linkedinPosts.approved, true),
          eq(linkedinPosts.autoPublish, true),
          isNotNull(linkedinPosts.scheduledAt),
          lte(linkedinPosts.scheduledAt, now),
          isNull(linkedinPosts.linkedinPostUrn)
        )
      );

    console.log(`[AutoPublish] Found ${postsToPublish.length} posts to publish`);

    if (postsToPublish.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No posts to auto-publish",
        timestamp: new Date().toISOString(),
      });
    }

    const results: Array<{
      postId: string;
      success: boolean;
      postUrn?: string;
      postUrl?: string;
      error?: string;
      notificationSent: boolean;
    }> = [];

    for (const { post, run } of postsToPublish) {
      // Determine user ID - from run if AI-generated, or we need another way for manual drafts
      // For manual drafts without runId, we need to store userId on the post itself
      // For now, skip posts without a way to identify the user
      const userId = run?.userId;

      if (!userId) {
        console.log(`[AutoPublish] Skipping post ${post.id} - no userId available`);
        results.push({
          postId: post.id,
          success: false,
          error: "No user ID available for this post",
          notificationSent: false,
        });
        continue;
      }

      // Get LinkedIn connection for this user
      const connection = await db
        .select()
        .from(linkedinConnections)
        .where(eq(linkedinConnections.userId, userId))
        .limit(1);

      if (connection.length === 0) {
        console.log(`[AutoPublish] User ${userId} has no LinkedIn connection`);
        await db
          .update(linkedinPosts)
          .set({ linkedinPublishError: "LinkedIn not connected" })
          .where(eq(linkedinPosts.id, post.id));
        results.push({
          postId: post.id,
          success: false,
          error: "LinkedIn not connected",
          notificationSent: false,
        });
        continue;
      }

      const linkedinConnection = connection[0];

      // Check if token expired
      if (linkedinConnection.expiresAt && linkedinConnection.expiresAt < now) {
        console.log(`[AutoPublish] LinkedIn token expired for user ${userId}`);
        await db
          .update(linkedinPosts)
          .set({ linkedinPublishError: "LinkedIn connection expired" })
          .where(eq(linkedinPosts.id, post.id));
        results.push({
          postId: post.id,
          success: false,
          error: "LinkedIn connection expired",
          notificationSent: false,
        });
        continue;
      }

      // Decrypt access token
      const accessToken = decryptToken(linkedinConnection.accessToken);
      const personUrn = linkedinConnection.linkedinProfileId;

      if (!personUrn) {
        console.log(`[AutoPublish] Missing LinkedIn profile ID for user ${userId}`);
        await db
          .update(linkedinPosts)
          .set({ linkedinPublishError: "LinkedIn profile ID missing" })
          .where(eq(linkedinPosts.id, post.id));
        results.push({
          postId: post.id,
          success: false,
          error: "LinkedIn profile ID missing",
          notificationSent: false,
        });
        continue;
      }

      // Get image if exists
      let imageUrl: string | undefined;
      let altText: string | undefined;
      const imageIntent = await db
        .select()
        .from(imageIntents)
        .where(eq(imageIntents.postId, post.id))
        .limit(1);

      if (imageIntent.length > 0 && imageIntent[0].generatedImageUrl) {
        imageUrl = imageIntent[0].generatedImageUrl;
        altText = imageIntent[0].headlineText || undefined;
      }

      // Publish to LinkedIn
      const client = new LinkedInClient(accessToken, personUrn);

      try {
        const publishResult = await client.createPost({
          text: post.fullText,
          imageUrl,
          altText,
        });

        // Update post with success
        await db
          .update(linkedinPosts)
          .set({
            linkedinPostUrn: publishResult.postUrn,
            linkedinPublishedAt: new Date(),
            linkedinPublishError: null,
          })
          .where(eq(linkedinPosts.id, post.id));

        console.log(`[AutoPublish] Published post ${post.id} as ${publishResult.postUrn}`);

        // Send push notification
        let notificationSent = false;
        const subscriptions = await db
          .select()
          .from(pushSubscriptions)
          .where(eq(pushSubscriptions.userId, userId));

        for (const sub of subscriptions) {
          const notifResult = await sendPostPublishedNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            {
              title: post.fullText.slice(0, 60),
              postUrl: publishResult.postUrl,
              contentId: post.id,
            }
          );
          if (notifResult.success) {
            notificationSent = true;
          }
        }

        results.push({
          postId: post.id,
          success: true,
          postUrn: publishResult.postUrn,
          postUrl: publishResult.postUrl,
          notificationSent,
        });
      } catch (error) {
        const errorMessage =
          error instanceof LinkedInError
            ? error.userMessage
            : "Failed to publish to LinkedIn";

        console.error(`[AutoPublish] Failed to publish post ${post.id}:`, error);

        await db
          .update(linkedinPosts)
          .set({ linkedinPublishError: errorMessage })
          .where(eq(linkedinPosts.id, post.id));

        results.push({
          postId: post.id,
          success: false,
          error: errorMessage,
          notificationSent: false,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.log(
      `[AutoPublish] Complete. Published: ${successCount}, Failed: ${failureCount}`
    );

    return NextResponse.json({
      success: true,
      message: "Auto-publish job completed",
      stats: {
        processed: results.length,
        published: successCount,
        failed: failureCount,
        notificationsSent: results.filter((r) => r.notificationSent).length,
      },
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[AutoPublish] Error:", error);
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

// Support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
