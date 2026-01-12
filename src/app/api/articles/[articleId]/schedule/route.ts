import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ articleId: string }>;
}

/**
 * PATCH /api/articles/[articleId]/schedule
 *
 * Updates the scheduled date and auto-publish setting for an article
 * Body: { scheduledAt: string | null, autoPublish?: boolean }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { articleId } = await params;
    const body = await request.json();
    const { scheduledAt, autoPublish } = body as {
      scheduledAt: string | null;
      autoPublish?: boolean;
    };

    // Check article exists
    const article = await db.query.articles.findFirst({
      where: eq(articles.id, articleId),
    });

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updates: { scheduledAt: Date | null; autoPublish?: boolean } = {
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    };

    // Only update autoPublish if explicitly provided
    if (typeof autoPublish === "boolean") {
      updates.autoPublish = autoPublish;
    }

    // Update the schedule
    await db
      .update(articles)
      .set(updates)
      .where(eq(articles.id, articleId));

    return NextResponse.json({
      success: true,
      articleId,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      autoPublish: typeof autoPublish === "boolean" ? autoPublish : article.autoPublish,
    });
  } catch (error) {
    console.error("Error scheduling article:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/articles/[articleId]/schedule
 *
 * Returns the schedule info for an article
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { articleId } = await params;

    const article = await db.query.articles.findFirst({
      where: eq(articles.id, articleId),
    });

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      articleId,
      scheduledAt: article.scheduledAt,
      scheduledPosition: article.scheduledPosition,
    });
  } catch (error) {
    console.error("Error fetching article schedule:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
