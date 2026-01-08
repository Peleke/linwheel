import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articleImageIntents, articleCoverVersions, type TextPosition } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateImage } from "@/lib/t2i";
import type { StylePreset, T2IProviderType } from "@/lib/t2i";
import { overlayCoverTextFromUrl } from "@/lib/carousel/text-overlay-satori";
import { uploadImage } from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth";
import { incrementImageUsage, canGenerateImages } from "@/lib/usage";
import { nanoid } from "nanoid";

interface RouteParams {
  params: Promise<{ intentId: string }>;
}

/**
 * GET /api/articles/image-intents/[intentId]
 *
 * Returns the full image intent data including prompts and version history
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

    // Fetch all versions for this intent
    const versions = await db.query.articleCoverVersions.findMany({
      where: eq(articleCoverVersions.articleImageIntentId, intentId),
      orderBy: [desc(articleCoverVersions.versionNumber)],
    });

    // Find the active version
    const activeVersion = versions.find(v => v.isActive) || versions[0];

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
      // Version info
      versionCount: versions.length,
      activeVersionId: activeVersion?.id || null,
      activeVersionNumber: activeVersion?.versionNumber || null,
      versions: versions.map(v => ({
        id: v.id,
        versionNumber: v.versionNumber,
        imageUrl: v.imageUrl,
        isActive: v.isActive,
        includeText: v.includeText,
        textPosition: v.textPosition,
        generatedAt: v.generatedAt,
      })),
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
 * Creates a version entry to track generation history.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { intentId } = await params;
    const body = await request.json();
    const {
      provider,
      model,
      includeText = true,
      textPosition = "center" as TextPosition,
    } = body as {
      provider?: T2IProviderType;
      model?: string;
      includeText?: boolean;
      textPosition?: TextPosition;
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

    // Get the current max version number
    const existingVersions = await db.query.articleCoverVersions.findMany({
      where: eq(articleCoverVersions.articleImageIntentId, intentId),
      orderBy: [desc(articleCoverVersions.versionNumber)],
    });
    const nextVersionNumber = existingVersions.length > 0
      ? existingVersions[0].versionNumber + 1
      : 1;

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
    const shouldOverlayText = includeText && intent.headlineText;

    if (shouldOverlayText) {
      try {
        console.log(`[ArticleImage] Overlaying text on cover image (position: ${textPosition})...`);
        const compositedBuffer = await overlayCoverTextFromUrl(result.imageUrl, {
          headline: intent.headlineText,
          width: 1200,
          height: 628,
          position: textPosition,
        });

        // Upload to storage with version in filename
        const filename = `article-cover-${intentId}-v${nextVersionNumber}.png`;
        finalImageUrl = await uploadImage(compositedBuffer, filename, "image/png");
        console.log(`[ArticleImage] Uploaded composited image: ${finalImageUrl}`);
      } catch (overlayError) {
        // If overlay fails, fall back to the raw T2I image
        console.error("[ArticleImage] Text overlay failed, using raw T2I image:", overlayError);
      }
    } else {
      // No text overlay - just upload the raw image with version in filename
      const filename = `article-cover-${intentId}-v${nextVersionNumber}-notext.png`;
      // For raw T2I images, we still need to upload them to our storage
      try {
        const response = await fetch(result.imageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        finalImageUrl = await uploadImage(buffer, filename, "image/png");
      } catch {
        // Keep the original URL if upload fails
        console.error("[ArticleImage] Failed to re-upload raw image, using original URL");
      }
    }

    // Deactivate all existing versions for this intent
    if (existingVersions.length > 0) {
      await db
        .update(articleCoverVersions)
        .set({ isActive: false })
        .where(eq(articleCoverVersions.articleImageIntentId, intentId));
    }

    // Create a new version entry
    const versionId = nanoid();
    await db.insert(articleCoverVersions).values({
      id: versionId,
      articleImageIntentId: intentId,
      versionNumber: nextVersionNumber,
      prompt: intent.prompt,
      headlineText: intent.headlineText,
      imageUrl: finalImageUrl,
      includeText: includeText,
      textPosition: textPosition,
      isActive: true,
      generatedAt: new Date(),
      generationProvider: result.provider,
      generationError: null,
    });

    // Update the main image intent with the latest result
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
      version: {
        id: versionId,
        versionNumber: nextVersionNumber,
        includeText,
        textPosition,
      },
    });
  } catch (error) {
    console.error("Error generating article image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
