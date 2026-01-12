/**
 * GET /api/cron/auto-publish
 *
 * Cron job to auto-publish scheduled posts, articles, AND carousels to LinkedIn.
 * Runs every 5 minutes. Publishes content where:
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
  articles,
  articleCarouselIntents,
  linkedinConnections,
  pushSubscriptions,
  imageIntents,
  articleImageIntents,
  generationRuns,
} from "@/db/schema";
import { eq, and, lte, isNotNull, isNull } from "drizzle-orm";
import { decryptToken } from "@/lib/crypto";
import { LinkedInClient, LinkedInError } from "@/lib/linkedin";
import { sendPostPublishedNotification } from "@/lib/push";
import { formatArticleForLinkedIn } from "@/lib/article-formatter";

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

    // Find articles ready for auto-publish
    const articlesToPublish = await db
      .select({
        article: articles,
        run: generationRuns,
      })
      .from(articles)
      .leftJoin(generationRuns, eq(articles.runId, generationRuns.id))
      .where(
        and(
          eq(articles.approved, true),
          eq(articles.autoPublish, true),
          isNotNull(articles.scheduledAt),
          lte(articles.scheduledAt, now),
          isNull(articles.linkedinPostUrn)
        )
      );

    console.log(`[AutoPublish] Found ${articlesToPublish.length} articles to publish`);

    // Find carousels ready for auto-publish
    const carouselsToPublish = await db
      .select({
        carousel: articleCarouselIntents,
        article: articles,
        run: generationRuns,
      })
      .from(articleCarouselIntents)
      .innerJoin(articles, eq(articleCarouselIntents.articleId, articles.id))
      .leftJoin(generationRuns, eq(articles.runId, generationRuns.id))
      .where(
        and(
          eq(articleCarouselIntents.status, "scheduled"),
          eq(articleCarouselIntents.autoPublish, true),
          isNotNull(articleCarouselIntents.scheduledAt),
          lte(articleCarouselIntents.scheduledAt, now),
          isNull(articleCarouselIntents.linkedinPostUrn)
        )
      );

    console.log(`[AutoPublish] Found ${carouselsToPublish.length} carousels to publish`);

    if (postsToPublish.length === 0 && articlesToPublish.length === 0 && carouselsToPublish.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No content to auto-publish",
        timestamp: new Date().toISOString(),
      });
    }

    const results: Array<{
      contentId: string;
      contentType: "post" | "article" | "carousel";
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
          contentId: post.id,
          contentType: "post",
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
          contentId: post.id,
          contentType: "post",
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
          contentId: post.id,
          contentType: "post",
          success: false,
          error: "LinkedIn connection expired",
          notificationSent: false,
        });
        continue;
      }

      // Decrypt access token
      const accessToken = decryptToken(linkedinConnection.accessToken);
      const profileId = linkedinConnection.linkedinProfileId;

      if (!profileId) {
        console.log(`[AutoPublish] Missing LinkedIn profile ID for user ${userId}`);
        await db
          .update(linkedinPosts)
          .set({ linkedinPublishError: "LinkedIn profile ID missing" })
          .where(eq(linkedinPosts.id, post.id));
        results.push({
          contentId: post.id,
          contentType: "post",
          success: false,
          error: "LinkedIn profile ID missing",
          notificationSent: false,
        });
        continue;
      }

      // Ensure the profile ID is a valid URN format
      const personUrn = profileId.startsWith("urn:li:person:")
        ? profileId
        : `urn:li:person:${profileId}`;

      // Get image if exists AND includeInPost is true
      let imageUrl: string | undefined;
      let altText: string | undefined;
      const imageIntent = await db
        .select()
        .from(imageIntents)
        .where(eq(imageIntents.postId, post.id))
        .limit(1);

      // Only include image if it exists, has a URL, AND includeInPost is true (or null/undefined for backwards compat)
      if (
        imageIntent.length > 0 &&
        imageIntent[0].generatedImageUrl &&
        (imageIntent[0].includeInPost === true || imageIntent[0].includeInPost === null)
      ) {
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
          contentId: post.id,
          contentType: "post",
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
          contentId: post.id,
          contentType: "post",
          success: false,
          error: errorMessage,
          notificationSent: false,
        });
      }
    }

    // Process articles
    for (const { article, run } of articlesToPublish) {
      const userId = run?.userId;

      if (!userId) {
        console.log(`[AutoPublish] Skipping article ${article.id} - no userId available`);
        results.push({
          contentId: article.id,
          contentType: "article",
          success: false,
          error: "No user ID available for this article",
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
          .update(articles)
          .set({ linkedinPublishError: "LinkedIn not connected" })
          .where(eq(articles.id, article.id));
        results.push({
          contentId: article.id,
          contentType: "article",
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
          .update(articles)
          .set({ linkedinPublishError: "LinkedIn connection expired" })
          .where(eq(articles.id, article.id));
        results.push({
          contentId: article.id,
          contentType: "article",
          success: false,
          error: "LinkedIn connection expired",
          notificationSent: false,
        });
        continue;
      }

      // Decrypt access token
      const accessToken = decryptToken(linkedinConnection.accessToken);
      const profileId = linkedinConnection.linkedinProfileId;

      if (!profileId) {
        console.log(`[AutoPublish] Missing LinkedIn profile ID for user ${userId}`);
        await db
          .update(articles)
          .set({ linkedinPublishError: "LinkedIn profile ID missing" })
          .where(eq(articles.id, article.id));
        results.push({
          contentId: article.id,
          contentType: "article",
          success: false,
          error: "LinkedIn profile ID missing",
          notificationSent: false,
        });
        continue;
      }

      // Ensure the profile ID is a valid URN format
      const personUrn = profileId.startsWith("urn:li:person:")
        ? profileId
        : `urn:li:person:${profileId}`;

      // Get cover image if exists AND includeInPost is true
      let imageUrl: string | undefined;
      let altText: string | undefined;
      const imageIntent = await db
        .select()
        .from(articleImageIntents)
        .where(eq(articleImageIntents.articleId, article.id))
        .limit(1);

      if (
        imageIntent.length > 0 &&
        imageIntent[0].generatedImageUrl &&
        (imageIntent[0].includeInPost === true || imageIntent[0].includeInPost === null)
      ) {
        imageUrl = imageIntent[0].generatedImageUrl;
        altText = imageIntent[0].headlineText || article.title;
      }

      // Format article for LinkedIn (fits 3000 char limit)
      const formattedContent = formatArticleForLinkedIn({
        title: article.title,
        subtitle: article.subtitle,
        introduction: article.introduction,
        sections: article.sections as string[],
        conclusion: article.conclusion,
      });

      // Publish to LinkedIn
      const client = new LinkedInClient(accessToken, personUrn);

      try {
        const publishResult = await client.createPost({
          text: formattedContent,
          imageUrl,
          altText,
        });

        // Update article with success
        await db
          .update(articles)
          .set({
            linkedinPostUrn: publishResult.postUrn,
            linkedinPublishedAt: new Date(),
            linkedinPublishError: null,
          })
          .where(eq(articles.id, article.id));

        console.log(`[AutoPublish] Published article ${article.id} as ${publishResult.postUrn}`);

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
              title: `Article: ${article.title.slice(0, 50)}`,
              postUrl: publishResult.postUrl,
              contentId: article.id,
            }
          );
          if (notifResult.success) {
            notificationSent = true;
          }
        }

        results.push({
          contentId: article.id,
          contentType: "article",
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

        console.error(`[AutoPublish] Failed to publish article ${article.id}:`, error);

        await db
          .update(articles)
          .set({ linkedinPublishError: errorMessage })
          .where(eq(articles.id, article.id));

        results.push({
          contentId: article.id,
          contentType: "article",
          success: false,
          error: errorMessage,
          notificationSent: false,
        });
      }
    }

    // Process carousels
    for (const { carousel, article, run } of carouselsToPublish) {
      const userId = run?.userId;

      if (!userId) {
        console.log(`[AutoPublish] Skipping carousel ${carousel.id} - no userId available`);
        results.push({
          contentId: carousel.id,
          contentType: "carousel",
          success: false,
          error: "No user ID available for this carousel",
          notificationSent: false,
        });
        continue;
      }

      // Check carousel has a generated PDF
      if (!carousel.generatedPdfUrl) {
        console.log(`[AutoPublish] Skipping carousel ${carousel.id} - no PDF generated`);
        await db
          .update(articleCarouselIntents)
          .set({
            publishError: "Carousel PDF not generated",
            status: "failed"
          })
          .where(eq(articleCarouselIntents.id, carousel.id));
        results.push({
          contentId: carousel.id,
          contentType: "carousel",
          success: false,
          error: "Carousel PDF not generated",
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
          .update(articleCarouselIntents)
          .set({ publishError: "LinkedIn not connected" })
          .where(eq(articleCarouselIntents.id, carousel.id));
        results.push({
          contentId: carousel.id,
          contentType: "carousel",
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
          .update(articleCarouselIntents)
          .set({ publishError: "LinkedIn connection expired" })
          .where(eq(articleCarouselIntents.id, carousel.id));
        results.push({
          contentId: carousel.id,
          contentType: "carousel",
          success: false,
          error: "LinkedIn connection expired",
          notificationSent: false,
        });
        continue;
      }

      // Decrypt access token
      const accessToken = decryptToken(linkedinConnection.accessToken);
      const profileId = linkedinConnection.linkedinProfileId;

      if (!profileId) {
        console.log(`[AutoPublish] Missing LinkedIn profile ID for user ${userId}`);
        await db
          .update(articleCarouselIntents)
          .set({ publishError: "LinkedIn profile ID missing" })
          .where(eq(articleCarouselIntents.id, carousel.id));
        results.push({
          contentId: carousel.id,
          contentType: "carousel",
          success: false,
          error: "LinkedIn profile ID missing",
          notificationSent: false,
        });
        continue;
      }

      // Ensure the profile ID is a valid URN format
      const personUrn = profileId.startsWith("urn:li:person:")
        ? profileId
        : `urn:li:person:${profileId}`;

      // Publish carousel to LinkedIn as document post
      const client = new LinkedInClient(accessToken, personUrn);

      // Use carousel caption or generate from article title
      const carouselText = carousel.caption || `${article.title}\n\n📄 Swipe through to learn more!`;

      try {
        const publishResult = await client.createDocumentPost({
          text: carouselText,
          documentUrl: carousel.generatedPdfUrl,
          title: article.title,
        });

        // Update carousel intent with success
        await db
          .update(articleCarouselIntents)
          .set({
            linkedinPostUrn: publishResult.postUrn,
            publishedAt: new Date(),
            publishError: null,
            status: "published",
          })
          .where(eq(articleCarouselIntents.id, carousel.id));

        console.log(`[AutoPublish] Published carousel ${carousel.id} as ${publishResult.postUrn}`);

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
              title: `Carousel: ${article.title.slice(0, 50)}`,
              postUrl: publishResult.postUrl,
              contentId: carousel.id,
            }
          );
          if (notifResult.success) {
            notificationSent = true;
          }
        }

        results.push({
          contentId: carousel.id,
          contentType: "carousel",
          success: true,
          postUrn: publishResult.postUrn,
          postUrl: publishResult.postUrl,
          notificationSent,
        });
      } catch (error) {
        const errorMessage =
          error instanceof LinkedInError
            ? error.userMessage
            : "Failed to publish carousel to LinkedIn";

        console.error(`[AutoPublish] Failed to publish carousel ${carousel.id}:`, error);

        await db
          .update(articleCarouselIntents)
          .set({
            publishError: errorMessage,
            status: "failed"
          })
          .where(eq(articleCarouselIntents.id, carousel.id));

        results.push({
          contentId: carousel.id,
          contentType: "carousel",
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
