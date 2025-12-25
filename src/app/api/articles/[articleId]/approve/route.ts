import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articles, articleImageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ articleId: string }>;
}

/**
 * POST /api/articles/[articleId]/approve
 *
 * Approves or unapproves an article. Does NOT trigger image generation.
 * Image generation is now a separate action via the Generate Image modal.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { articleId } = await params;
    const body = await request.json();
    const { approved } = body as { approved: boolean };

    if (typeof approved !== "boolean") {
      return NextResponse.json(
        { error: "approved must be a boolean" },
        { status: 400 }
      );
    }

    // Check if article exists
    const article = await db.query.articles.findFirst({
      where: eq(articles.id, articleId),
    });

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    // Update approval status
    await db
      .update(articles)
      .set({ approved })
      .where(eq(articles.id, articleId));

    // Get image intent status (but don't generate)
    let imageIntent = null;
    const intent = await db.query.articleImageIntents.findFirst({
      where: eq(articleImageIntents.articleId, articleId),
    });

    if (intent) {
      imageIntent = {
        intentId: intent.id,
        hasImage: !!intent.generatedImageUrl,
        imageUrl: intent.generatedImageUrl,
      };
    }

    return NextResponse.json({ success: true, approved, imageIntent });
  } catch (error) {
    console.error("Error updating article approval:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
