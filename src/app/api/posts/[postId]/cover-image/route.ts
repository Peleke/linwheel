import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { imageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

/**
 * GET /api/posts/[postId]/cover-image
 *
 * Get cover image info for a post
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { postId } = await params;

    const intent = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.postId, postId),
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
 * PATCH /api/posts/[postId]/cover-image
 *
 * Update cover image settings (toggle includeInPost)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { postId } = await params;
    const body = await request.json();
    const { includeInPost } = body as { includeInPost?: boolean };

    if (typeof includeInPost !== "boolean") {
      return NextResponse.json(
        { error: "includeInPost must be a boolean" },
        { status: 400 }
      );
    }

    const intent = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.postId, postId),
    });

    if (!intent) {
      return NextResponse.json(
        { error: "No cover image found for this post" },
        { status: 404 }
      );
    }

    await db
      .update(imageIntents)
      .set({ includeInPost })
      .where(eq(imageIntents.id, intent.id));

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
 * DELETE /api/posts/[postId]/cover-image
 *
 * Delete the cover image (set generatedImageUrl to null)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { postId } = await params;

    const intent = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.postId, postId),
    });

    if (!intent) {
      return NextResponse.json(
        { error: "No cover image found for this post" },
        { status: 404 }
      );
    }

    // Clear the generated image URL but keep the intent for potential regeneration
    await db
      .update(imageIntents)
      .set({
        generatedImageUrl: null,
        generatedAt: null,
        generationError: null,
      })
      .where(eq(imageIntents.id, intent.id));

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
