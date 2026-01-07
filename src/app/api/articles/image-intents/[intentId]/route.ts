import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articleImageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateImage } from "@/lib/t2i";
import type { StylePreset, T2IProviderType } from "@/lib/t2i";
import { overlayCoverTextFromUrl } from "@/lib/carousel/text-overlay-satori";
import { uploadImage } from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth";
import { incrementImageUsage, canGenerateImages } from "@/lib/usage";

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
 * Triggers image generation for the article intent.
 * Generates T2I background, overlays headline text with Satori, uploads to storage.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { intentId } = await params;
    const body = await request.json();
    const { provider, model } = body as {
      provider?: T2IProviderType;
      model?: string;
    };

    // Check user and image usage limits
    const user = await getCurrentUser();
    if (user) {
      const { allowed, usage } = await canGenerateImages(user.id);
      if (!allowed) {
        return NextResponse.json(
          {
            error: "Image generation limit reached",
            usage: {
              used: usage.count,
              limit: usage.limit,
              remaining: usage.remaining,
            }
          },
          { status: 403 }
        );
      }
    }

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

    // Generate the background image (T2I is unreliable with text, so don't pass headline)
    const result = await generateImage(
      {
        prompt: intent.prompt,
        negativePrompt: intent.negativePrompt,
        headlineText: "", // Don't include text in T2I prompt - we overlay it ourselves
        stylePreset: intent.stylePreset as StylePreset,
        aspectRatio: "1.91:1",
        quality: "hd",
      },
      provider,
      model
    );

    if (!result.success || !result.imageUrl) {
      // T2I failed - update DB with error
      await db
        .update(articleImageIntents)
        .set({
          generationError: result.error,
          generatedAt: new Date(),
          generationProvider: result.provider,
        })
        .where(eq(articleImageIntents.id, intentId));

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          provider: result.provider,
        },
        { status: 500 }
      );
    }

    // Overlay headline text on the background using Satori (works on Vercel)
    let finalImageUrl = result.imageUrl;

    if (intent.headlineText) {
      try {
        console.log(`[ArticleImage] Overlaying text on cover image...`);
        const compositedBuffer = await overlayCoverTextFromUrl(result.imageUrl, {
          headline: intent.headlineText,
          width: 1200,
          height: 628,
        });

        // Upload to storage
        const filename = `article-cover-${intentId}.png`;
        finalImageUrl = await uploadImage(compositedBuffer, filename, "image/png");
        console.log(`[ArticleImage] Uploaded composited image: ${finalImageUrl}`);
      } catch (overlayError) {
        // If overlay fails, fall back to the raw T2I image
        console.error("[ArticleImage] Text overlay failed, using raw T2I image:", overlayError);
      }
    }

    // Update the database with the result
    await db
      .update(articleImageIntents)
      .set({
        generatedImageUrl: finalImageUrl,
        generatedAt: new Date(),
        generationProvider: result.provider,
        generationError: null,
      })
      .where(eq(articleImageIntents.id, intentId));

    // Increment image usage after successful generation
    if (user) {
      await incrementImageUsage(user.id, 1);
    }

    return NextResponse.json({
      success: true,
      imageUrl: finalImageUrl,
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
