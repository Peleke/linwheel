/**
 * POST /api/articles/[articleId]/publish-linkedin - Publish article to LinkedIn
 *
 * Publishes an approved article to the user's connected LinkedIn account.
 * The article content is formatted to fit LinkedIn's post character limit (3000 chars).
 * Cover images are included if available and enabled.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articles, articleImageIntents, linkedinConnections, generationRuns } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { decryptToken } from "@/lib/crypto";
import { LinkedInClient, LinkedInError } from "@/lib/linkedin";
import { formatArticleForLinkedIn } from "@/lib/article-formatter";

interface RouteParams {
  params: Promise<{ articleId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Require authenticated user
    let user;
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { articleId } = await params;

    // Get the article with its generation run (for user validation)
    const articleResult = await db
      .select({
        article: articles,
        run: generationRuns,
      })
      .from(articles)
      .leftJoin(generationRuns, eq(articles.runId, generationRuns.id))
      .where(eq(articles.id, articleId))
      .limit(1);

    if (articleResult.length === 0) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const { article, run } = articleResult[0];

    // Verify the article belongs to this user (via the generation run)
    if (run?.userId && run.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if article is approved
    if (!article.approved) {
      return NextResponse.json(
        { error: "Article must be approved before publishing" },
        { status: 400 }
      );
    }

    // Check if already published
    if (article.linkedinPostUrn) {
      return NextResponse.json(
        {
          error: "Article already published to LinkedIn",
          linkedinPostUrn: article.linkedinPostUrn,
        },
        { status: 400 }
      );
    }

    // Get LinkedIn connection
    const connection = await db
      .select()
      .from(linkedinConnections)
      .where(eq(linkedinConnections.userId, user.id))
      .limit(1);

    if (connection.length === 0) {
      return NextResponse.json(
        { error: "LinkedIn account not connected" },
        { status: 400 }
      );
    }

    const linkedinConnection = connection[0];

    // Check if token expired
    if (linkedinConnection.expiresAt && new Date(linkedinConnection.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "LinkedIn connection expired. Please reconnect." },
        { status: 400 }
      );
    }

    // Decrypt access token
    const accessToken = decryptToken(linkedinConnection.accessToken);
    const profileId = linkedinConnection.linkedinProfileId;

    if (!profileId) {
      return NextResponse.json(
        { error: "LinkedIn profile ID missing. Please reconnect." },
        { status: 400 }
      );
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
      .where(eq(articleImageIntents.articleId, articleId))
      .limit(1);

    // Only include image if it exists, has a URL, AND includeInPost is true (or null for backwards compat)
    if (
      imageIntent.length > 0 &&
      imageIntent[0].generatedImageUrl &&
      (imageIntent[0].includeInPost === true || imageIntent[0].includeInPost === null)
    ) {
      imageUrl = imageIntent[0].generatedImageUrl;
      altText = imageIntent[0].headlineText || article.title;
    }

    // Format article content for LinkedIn
    const formattedContent = formatArticleForLinkedIn({
      title: article.title,
      subtitle: article.subtitle,
      introduction: article.introduction,
      sections: article.sections as string[],
      conclusion: article.conclusion,
    });

    // Create LinkedIn client and publish
    const client = new LinkedInClient(accessToken, personUrn);

    try {
      const result = await client.createPost({
        text: formattedContent,
        imageUrl,
        altText,
      });

      // Update article with LinkedIn URN
      await db
        .update(articles)
        .set({
          linkedinPostUrn: result.postUrn,
          linkedinPublishedAt: new Date(),
          linkedinPublishError: null,
        })
        .where(eq(articles.id, articleId));

      return NextResponse.json({
        success: true,
        postUrn: result.postUrn,
        postUrl: result.postUrl,
        formattedLength: formattedContent.length,
      });
    } catch (error) {
      // Store error in database for debugging
      const errorMessage =
        error instanceof LinkedInError
          ? error.userMessage
          : "Failed to publish to LinkedIn";

      await db
        .update(articles)
        .set({
          linkedinPublishError: errorMessage,
        })
        .where(eq(articles.id, articleId));

      console.error("LinkedIn article publish error:", error);

      if (error instanceof LinkedInError) {
        return NextResponse.json(
          { error: error.userMessage, code: error.code },
          { status: error.requiresReconnect ? 401 : 500 }
        );
      }

      return NextResponse.json(
        { error: "Failed to publish to LinkedIn" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Publish article to LinkedIn error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
