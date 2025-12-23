/**
 * Image Generation API
 *
 * POST /api/images/generate
 *
 * Generates images for post/article image intents using the configured T2I provider.
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { imageIntents, articleImageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateImage, getProviderStatus } from "@/lib/t2i";
import type { T2IProviderType, StylePreset } from "@/lib/t2i";

interface GenerateRequest {
  /** ID of the image intent to generate */
  intentId: string;
  /** Whether this is an article image intent */
  isArticle?: boolean;
  /** Override the default provider */
  provider?: T2IProviderType;
}

export async function POST(request: Request) {
  try {
    const body: GenerateRequest = await request.json();
    const { intentId, isArticle = false, provider } = body;

    if (!intentId) {
      return NextResponse.json(
        { error: "intentId is required" },
        { status: 400 }
      );
    }

    // Fetch the image intent based on type
    let intent;
    if (isArticle) {
      intent = await db.query.articleImageIntents.findFirst({
        where: eq(articleImageIntents.id, intentId),
      });
    } else {
      intent = await db.query.imageIntents.findFirst({
        where: eq(imageIntents.id, intentId),
      });
    }

    if (!intent) {
      return NextResponse.json(
        { error: "Image intent not found" },
        { status: 404 }
      );
    }

    // Check if already generated
    if (intent.generatedImageUrl) {
      return NextResponse.json({
        success: true,
        imageUrl: intent.generatedImageUrl,
        provider: intent.generationProvider,
        cached: true,
      });
    }

    // Generate the image
    const result = await generateImage(
      {
        prompt: intent.prompt,
        negativePrompt: intent.negativePrompt,
        headlineText: intent.headlineText,
        stylePreset: intent.stylePreset as StylePreset,
        aspectRatio: "1.91:1", // LinkedIn cover image ratio
        quality: "hd",
      },
      provider
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

    if (isArticle) {
      await db
        .update(articleImageIntents)
        .set(updateData)
        .where(eq(articleImageIntents.id, intentId));
    } else {
      await db
        .update(imageIntents)
        .set(updateData)
        .where(eq(imageIntents.id, intentId));
    }

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
    console.error("[API] Image generation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Image generation failed",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/images/generate
 *
 * Returns the status of available providers
 */
export async function GET() {
  const status = getProviderStatus();

  return NextResponse.json({
    providers: status,
    defaultProvider: process.env.T2I_PROVIDER || "openai",
  });
}
