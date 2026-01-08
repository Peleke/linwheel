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
 * Updates the scheduled date for an article
 * Body: { scheduledAt: string | null }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { articleId } = await params;
    const body = await request.json();
    const { scheduledAt } = body as { scheduledAt: string | null };

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

    // Update the schedule
    await db
      .update(articles)
      .set({
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      })
      .where(eq(articles.id, articleId));

    return NextResponse.json({
      success: true,
      articleId,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
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
