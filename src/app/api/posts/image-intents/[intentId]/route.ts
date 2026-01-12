import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { imageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateImage } from "@/lib/t2i";
import type { StylePreset, T2IProviderType } from "@/lib/t2i";
import { overlayCoverTextFromUrl } from "@/lib/carousel/text-overlay-satori";
import { uploadImage } from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth";
import { incrementImageUsage, canGenerateImages } from "@/lib/usage";
import { getActiveBrandStyle, composePromptWithBrandStyle, composeNegativeWithBrandStyle } from "@/lib/brand-styles";

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
 * Triggers image generation for the intent.
 * Generates T2I background, overlays headline text with Satori, uploads to storage.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  console.log(`[PostImage] ========== POST HANDLER CALLED ==========`);
  try {
    const { intentId } = await params;
    console.log(`[PostImage] Intent ID: ${intentId}`);
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
    const intent = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.id, intentId),
    });

    if (!intent) {
      return NextResponse.json(
        { error: "Image intent not found" },
        { status: 404 }
      );
    }

    // Apply brand style to prompts if user has an active one
    let finalPrompt = intent.prompt;
    let finalNegativePrompt = intent.negativePrompt;

    console.log(`[PostImage] User check: ${user ? `authenticated (${user.id.slice(0, 8)}...)` : "NOT authenticated"}`);

    if (user) {
      const brandStyle = await getActiveBrandStyle(user.id);
      console.log(`[PostImage] Brand style lookup: ${brandStyle ? `found "${brandStyle.name}" (active: ${brandStyle.isActive})` : "NONE FOUND"}`);
      if (brandStyle) {
        console.log(`[PostImage] Applying brand style "${brandStyle.name}" to image generation`);
        console.log(`[PostImage] Brand colors: ${JSON.stringify(brandStyle.primaryColors?.slice(0, 2))}`);
        finalPrompt = composePromptWithBrandStyle(intent.prompt, brandStyle);
        finalNegativePrompt = composeNegativeWithBrandStyle(intent.negativePrompt || "", brandStyle);
        console.log(`[PostImage] Original prompt: ${intent.prompt.slice(0, 100)}...`);
        console.log(`[PostImage] Final prompt: ${finalPrompt.slice(0, 150)}...`);
      }
    } else {
      console.log(`[PostImage] Skipping brand style - no authenticated user`);
    }

    // Generate the background image (T2I is unreliable with text, so don't pass headline)
    const result = await generateImage(
      {
        prompt: finalPrompt,
        negativePrompt: finalNegativePrompt,
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

    // Overlay headline text on the background using Satori (works on Vercel)
    let finalImageUrl = result.imageUrl;

    if (intent.headlineText) {
      try {
        console.log(`[PostImage] Overlaying text on cover image...`);
        const compositedBuffer = await overlayCoverTextFromUrl(result.imageUrl, {
          headline: intent.headlineText,
          width: 1200,
          height: 628,
        });

        // Upload to storage
        const filename = `post-cover-${intentId}.png`;
        finalImageUrl = await uploadImage(compositedBuffer, filename, "image/png");
        console.log(`[PostImage] Uploaded composited image: ${finalImageUrl}`);
      } catch (overlayError) {
        // If overlay fails, fall back to the raw T2I image
        console.error("[PostImage] Text overlay failed, using raw T2I image:", overlayError);
      }
    }

    // Update the database with the result
    await db
      .update(imageIntents)
      .set({
        generatedImageUrl: finalImageUrl,
        generatedAt: new Date(),
        generationProvider: result.provider,
        generationError: null,
      })
      .where(eq(imageIntents.id, intentId));

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
    console.error("Error generating image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
