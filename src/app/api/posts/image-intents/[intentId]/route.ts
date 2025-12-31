import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { imageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateImage } from "@/lib/t2i";
import type { StylePreset, T2IProviderType } from "@/lib/t2i";
import { overlayCoverText } from "@/lib/carousel/text-overlay";
import { createSupabaseStorageProvider, isSupabaseStorageConfigured } from "@/lib/storage/supabase";

interface RouteParams {
  params: Promise<{ intentId: string }>;
}

/**
 * GET /api/posts/image-intents/[intentId]
 *
 * Returns the full image intent data including prompts
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { intentId } = await params;

    const intent = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.id, intentId),
    });

    if (!intent) {
      return NextResponse.json(
        { error: "Image intent not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: intent.id,
      postId: intent.postId,
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
    console.error("Error fetching image intent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/posts/image-intents/[intentId]
 *
 * Updates the prompts for an image intent
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
    const existing = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.id, intentId),
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
      .update(imageIntents)
      .set(updates)
      .where(eq(imageIntents.id, intentId));

    // Fetch updated intent
    const updated = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.id, intentId),
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
    console.error("Error updating image intent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts/image-intents/[intentId]
 *
 * Triggers image generation for the intent
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
    const intent = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.id, intentId),
    });

    if (!intent) {
      return NextResponse.json(
        { error: "Image intent not found" },
        { status: 404 }
      );
    }

    // Generate the background image (T2I)
    console.log(`[PostImage] Generating T2I background for intent ${intentId}`);
    const result = await generateImage(
      {
        prompt: intent.prompt,
        negativePrompt: intent.negativePrompt,
        headlineText: "", // Don't include text in T2I prompt - we'll overlay it
        stylePreset: intent.stylePreset as StylePreset,
        aspectRatio: "1.91:1",
        quality: "hd",
      },
      provider,
      model
    );

    if (!result.success || !result.imageUrl) {
      await db
        .update(imageIntents)
        .set({
          generationError: result.error,
          generatedAt: new Date(),
          generationProvider: result.provider,
        })
        .where(eq(imageIntents.id, intentId));

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          provider: result.provider,
        },
        { status: 500 }
      );
    }

    // Overlay headline text on the T2I background
    console.log(`[PostImage] Overlaying text: "${intent.headlineText}"`);
    let finalImageUrl = result.imageUrl;

    try {
      const compositedBuffer = await overlayCoverText(
        result.imageUrl,
        intent.headlineText,
        1200,
        628
      );

      // Upload composited image to storage
      if (isSupabaseStorageConfigured()) {
        const storage = createSupabaseStorageProvider();
        finalImageUrl = await storage.upload(
          compositedBuffer,
          `post-${intent.postId}-cover.png`,
          "image/png"
        );
        console.log(`[PostImage] Uploaded to Supabase: ${finalImageUrl}`);
      } else {
        // Fallback to base64 data URL
        finalImageUrl = `data:image/png;base64,${compositedBuffer.toString("base64")}`;
        console.log(`[PostImage] Using base64 (no Supabase configured)`);
      }
    } catch (overlayError) {
      console.error("[PostImage] Text overlay failed, using raw T2I:", overlayError);
      // Fall back to raw T2I image if overlay fails
    }

    // Update the database with the final result
    await db
      .update(imageIntents)
      .set({
        generatedImageUrl: finalImageUrl,
        generatedAt: new Date(),
        generationProvider: result.provider,
        generationError: null,
      })
      .where(eq(imageIntents.id, intentId));

    return NextResponse.json({
      success: true,
      imageUrl: finalImageUrl,
      provider: result.provider,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
