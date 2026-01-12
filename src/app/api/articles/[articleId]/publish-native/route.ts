/**
 * POST /api/articles/[articleId]/publish-native - Publish native LinkedIn article
 *
 * Calls the Modal Publishing Agent to publish a native LinkedIn article (long-form blog post)
 * via browser automation. This bypasses LinkedIn API limitations that only support posts.
 *
 * Requires:
 * - User must have a LinkedIn OAuth connection
 * - User must have saved their li_at browser cookie
 * - Article must be approved
 * - Publishing Agent must be configured (PUBLISHING_AGENT_URL, PUBLISHING_AGENT_HMAC_SECRET)
 *
 * Note: This calls an external service and may take 30-90 seconds to complete.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  articles,
  articleImageIntents,
  linkedinConnections,
  generationRuns,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { decryptToken } from "@/lib/crypto";
import {
  publishArticleViaAgent,
  isPublishingAgentConfigured,
  PublishingAgentError,
} from "@/lib/publishing-agent";

interface RouteParams {
  params: Promise<{ articleId: string }>;
}

/**
 * Convert article sections to HTML content for LinkedIn's editor
 */
function formatArticleAsHtml(article: {
  title: string;
  subtitle: string | null;
  introduction: string;
  sections: string[];
  conclusion: string;
}): string {
  const parts: string[] = [];

  // Add introduction
  if (article.introduction) {
    parts.push(`<p>${escapeHtml(article.introduction)}</p>`);
  }

  // Add sections - each section might be a heading + content
  if (article.sections && Array.isArray(article.sections)) {
    for (const section of article.sections) {
      // Sections are typically stored as plain text paragraphs
      // Convert to paragraph HTML
      const paragraphs = section.split("\n\n").filter(Boolean);
      for (const para of paragraphs) {
        // Check if this looks like a heading (short, no period at end)
        if (para.length < 100 && !para.endsWith(".") && para.includes(":")) {
          parts.push(`<h2>${escapeHtml(para)}</h2>`);
        } else {
          parts.push(`<p>${escapeHtml(para)}</p>`);
        }
      }
    }
  }

  // Add conclusion
  if (article.conclusion) {
    parts.push(`<p>${escapeHtml(article.conclusion)}</p>`);
  }

  return parts.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

    // Get the article with its generation run
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

    // Verify ownership
    if (run?.userId && run.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if approved
    if (!article.approved) {
      return NextResponse.json(
        { error: "Article must be approved before publishing" },
        { status: 400 }
      );
    }

    // Check if already published (allow retry if there was an error)
    if (article.linkedinPostUrn && !article.linkedinPublishError) {
      return NextResponse.json(
        {
          error: "Article already published to LinkedIn",
          linkedinPostUrn: article.linkedinPostUrn,
        },
        { status: 400 }
      );
    }

    // Get LinkedIn connection with li_at cookie
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

    // Check if Publishing Agent is configured
    if (!isPublishingAgentConfigured()) {
      return NextResponse.json(
        {
          error: "Native article publishing is not configured. Contact support.",
          code: "AGENT_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    // Check if li_at cookie is available
    if (!linkedinConnection.liAtCookie) {
      return NextResponse.json(
        {
          error:
            "Native article publishing requires a browser session cookie. Please add your li_at cookie in Settings.",
          code: "COOKIE_REQUIRED",
        },
        { status: 400 }
      );
    }

    // Decrypt the cookie for the agent
    let decryptedCookie: string;
    try {
      decryptedCookie = decryptToken(linkedinConnection.liAtCookie);
    } catch {
      return NextResponse.json(
        {
          error: "Failed to decrypt session cookie. Please re-enter your li_at cookie in Settings.",
          code: "COOKIE_DECRYPT_FAILED",
        },
        { status: 400 }
      );
    }

    // Get cover image if available
    let coverImageUrl: string | undefined;
    const imageIntent = await db
      .select()
      .from(articleImageIntents)
      .where(eq(articleImageIntents.articleId, articleId))
      .limit(1);

    if (imageIntent.length > 0 && imageIntent[0].generatedImageUrl) {
      coverImageUrl = imageIntent[0].generatedImageUrl;
    }

    // Format article content as HTML
    const htmlContent = formatArticleAsHtml({
      title: article.title,
      subtitle: article.subtitle,
      introduction: article.introduction,
      sections: article.sections as string[],
      conclusion: article.conclusion,
    });

    console.log(
      `[Publish Native] Calling Publishing Agent for article ${articleId}`
    );

    // Call the Modal Publishing Agent
    const result = await publishArticleViaAgent({
      cookie: decryptedCookie,
      title: article.title,
      content: htmlContent,
      coverImageUrl,
      headless: true,
    });

    if (result.success && result.articleUrl) {
      // Update article with success
      // For native articles, we use the URL as the URN since we don't get a URN back
      await db
        .update(articles)
        .set({
          linkedinPostUrn: result.articleUrl,
          linkedinPublishedAt: new Date(),
          linkedinPublishError: null,
        })
        .where(eq(articles.id, articleId));

      console.log(
        `[Publish Native] Successfully published article ${articleId}: ${result.articleUrl}`
      );

      return NextResponse.json({
        success: true,
        articleUrl: result.articleUrl,
        message: "Native LinkedIn article published successfully!",
      });
    } else {
      // Store error
      const errorMessage = result.error || "Unknown error during publishing";

      await db
        .update(articles)
        .set({
          linkedinPublishError: errorMessage,
        })
        .where(eq(articles.id, articleId));

      console.error(
        `[Publish Native] Failed to publish article ${articleId}: ${errorMessage}`
      );

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          code:
            result.error?.includes("Session expired") ||
            result.error?.includes("invalid cookie")
              ? "COOKIE_EXPIRED"
              : "PUBLISH_FAILED",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Publish Native] Error:", error);

    // Handle Publishing Agent specific errors
    if (error instanceof PublishingAgentError) {
      const statusMap: Record<string, number> = {
        CONFIG_MISSING: 503,
        AGENT_UNAVAILABLE: 503,
        AUTH_FAILED: 500,
        TIMEOUT: 504,
        PUBLISH_FAILED: 500,
      };

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: statusMap[error.code] || 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
