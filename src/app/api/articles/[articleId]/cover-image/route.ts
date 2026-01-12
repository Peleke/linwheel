import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articleImageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ articleId: string }>;
}

/**
 * GET /api/articles/[articleId]/cover-image
 *
 * Get cover image info for an article
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { articleId } = await params;

    const intent = await db.query.articleImageIntents.findFirst({
      where: eq(articleImageIntents.articleId, articleId),
    });

    if (!intent) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      intentId: intent.id,
      generatedImageUrl: intent.generatedImageUrl,
      includeInPost: intent.includeInPost ?? true,
    });
  } catch (error) {
    console.error("Error fetching cover image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/articles/[articleId]/cover-image
 *
 * Update cover image settings (toggle includeInPost)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { articleId } = await params;
    const body = await request.json();
    const { includeInPost } = body as { includeInPost?: boolean };

    if (typeof includeInPost !== "boolean") {
      return NextResponse.json(
        { error: "includeInPost must be a boolean" },
        { status: 400 }
      );
    }

    const intent = await db.query.articleImageIntents.findFirst({
      where: eq(articleImageIntents.articleId, articleId),
    });

    if (!intent) {
      return NextResponse.json(
        { error: "No cover image found for this article" },
        { status: 404 }
      );
    }

    await db
      .update(articleImageIntents)
      .set({ includeInPost })
      .where(eq(articleImageIntents.id, intent.id));

    return NextResponse.json({
      success: true,
      includeInPost,
    });
  } catch (error) {
    console.error("Error updating cover image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/articles/[articleId]/cover-image
 *
 * Delete the cover image (set generatedImageUrl to null)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { articleId } = await params;

    const intent = await db.query.articleImageIntents.findFirst({
      where: eq(articleImageIntents.articleId, articleId),
    });

    if (!intent) {
      return NextResponse.json(
        { error: "No cover image found for this article" },
        { status: 404 }
      );
    }

    // Clear the generated image URL but keep the intent for potential regeneration
    await db
      .update(articleImageIntents)
      .set({
        generatedImageUrl: null,
        generatedAt: null,
        generationError: null,
      })
      .where(eq(articleImageIntents.id, intent.id));

    return NextResponse.json({
      success: true,
      message: "Cover image deleted",
    });
  } catch (error) {
    console.error("Error deleting cover image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
