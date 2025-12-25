import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articleImageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateImage } from "@/lib/t2i";
import type { StylePreset, T2IProviderType } from "@/lib/t2i";

interface RouteParams {
  params: Promise<{ intentId: string }>;
}

/**
 * GET /api/articles/image-intents/[intentId]
 *
 * Returns the full image intent data including prompts
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { intentId } = await params;

    const intent = await db.query.articleImageIntents.findFirst({
      where: eq(articleImageIntents.id, intentId),
    });

    if (!intent) {
      return NextResponse.json(
        { error: "Image intent not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: intent.id,
      articleId: intent.articleId,
      prompt: intent.prompt,
      negativePrompt: intent.negativePrompt,
      headlineText: intent.headlineText,
      stylePreset: intent.stylePreset,
      generatedImageUrl: intent.generatedImageUrl,
      generatedAt: intent.generatedAt,
      generationProvider: intent.generationProvider,
      generationError: intent.generationError,
    });
  } catch (error) {
    console.error("Error fetching article image intent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/articles/image-intents/[intentId]
 *
 * Updates the prompts for an article image intent
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { intentId } = await params;
    const body = await request.json();
    const { prompt, negativePrompt, headlineText, stylePreset } = body as {
      prompt?: string;
      negativePrompt?: string;
      headlineText?: string;
      stylePreset?: string;
    };

    // Check if intent exists
    const existing = await db.query.articleImageIntents.findFirst({
      where: eq(articleImageIntents.id, intentId),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Image intent not found" },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updates: Record<string, string | null> = {};
    if (prompt !== undefined) updates.prompt = prompt;
    if (negativePrompt !== undefined) updates.negativePrompt = negativePrompt;
    if (headlineText !== undefined) updates.headlineText = headlineText;
    if (stylePreset !== undefined) updates.stylePreset = stylePreset;

    // Update the intent
    await db
      .update(articleImageIntents)
      .set(updates)
      .where(eq(articleImageIntents.id, intentId));

    // Fetch updated intent
    const updated = await db.query.articleImageIntents.findFirst({
      where: eq(articleImageIntents.id, intentId),
    });

    return NextResponse.json({
      success: true,
      intent: {
        id: updated!.id,
        prompt: updated!.prompt,
        negativePrompt: updated!.negativePrompt,
        headlineText: updated!.headlineText,
        stylePreset: updated!.stylePreset,
      },
    });
  } catch (error) {
    console.error("Error updating article image intent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/articles/image-intents/[intentId]
 *
 * Triggers image generation for the article intent
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { intentId } = await params;
    const body = await request.json();
    const { provider, model } = body as {
      provider?: T2IProviderType;
      model?: string;
    };

    // Fetch the intent
    const intent = await db.query.articleImageIntents.findFirst({
      where: eq(articleImageIntents.id, intentId),
    });

    if (!intent) {
      return NextResponse.json(
        { error: "Image intent not found" },
        { status: 404 }
      );
    }

    // Generate the image
    const result = await generateImage(
      {
        prompt: intent.prompt,
        negativePrompt: intent.negativePrompt,
        headlineText: intent.headlineText,
        stylePreset: intent.stylePreset as StylePreset,
        aspectRatio: "1.91:1",
        quality: "hd",
      },
      provider,
      model
    );

    // Update the database with the result
    const updateData = result.success
      ? {
          generatedImageUrl: result.imageUrl,
          generatedAt: new Date(),
          generationProvider: result.provider,
          generationError: null,
        }
      : {
          generationError: result.error,
          generatedAt: new Date(),
          generationProvider: result.provider,
        };

    await db
      .update(articleImageIntents)
      .set(updateData)
      .where(eq(articleImageIntents.id, intentId));

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          provider: result.provider,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      provider: result.provider,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("Error generating article image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
