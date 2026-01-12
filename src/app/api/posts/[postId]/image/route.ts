/**
 * POST /api/posts/[postId]/image - Generate cover image for a post
 * GET /api/posts/[postId]/image - Get image status
 *
 * Creates an image intent if needed, then generates the cover image.
 * Works for both AI-generated and manual draft posts.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { linkedinPosts, imageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import { generateImage } from "@/lib/t2i";
import type { StylePreset, T2IProviderType } from "@/lib/t2i";
import { overlayCoverTextFromUrl } from "@/lib/carousel/text-overlay-satori";
import { uploadImage } from "@/lib/storage";
import { incrementImageUsage, canGenerateImages } from "@/lib/usage";
import { getActiveBrandStyle, composePromptWithBrandStyle, composeNegativeWithBrandStyle } from "@/lib/brand-styles";
import { generateImageIntent } from "@/lib/generate";
import { getPostImageDimensions, DEFAULT_POST_IMAGE_SIZE } from "@/lib/linkedin-image-config";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

/**
 * GET - Get image status for a post
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { postId } = await params;

    // Get image intent if exists
    const intent = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.postId, postId),
    });

    if (!intent) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      intentId: intent.id,
      prompt: intent.prompt,
      headlineText: intent.headlineText,
      generatedImageUrl: intent.generatedImageUrl,
      generatedAt: intent.generatedAt,
      error: intent.generationError,
    });
  } catch (error) {
    console.error("Get post image error:", error);
    return NextResponse.json(
      { error: "Failed to get image status" },
      { status: 500 }
    );
  }
}

/**
 * POST - Generate cover image for a post
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Require auth
    let user;
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await params;
    const body = await request.json().catch(() => ({}));
    const { provider, model, customPrompt, customHeadline, imageSize } = body as {
      provider?: T2IProviderType;
      model?: string;
      customPrompt?: string;
      customHeadline?: string;
      imageSize?: "square" | "portrait" | "landscape";
    };

    // Check usage limits
    const { allowed, usage } = await canGenerateImages(user.id);
    if (!allowed) {
      return NextResponse.json(
        {
          error: "Image generation limit reached",
          usage: { used: usage.count, limit: usage.limit, remaining: usage.remaining },
        },
        { status: 403 }
      );
    }

    // Get the post
    const post = await db.query.linkedinPosts.findFirst({
      where: eq(linkedinPosts.id, postId),
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check for existing intent
    let intent = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.postId, postId),
    });

    // Create intent if doesn't exist
    if (!intent) {
      console.log(`[PostImage] Creating new image intent for post ${postId}`);

      // Generate prompt from post content using LLM
      let prompt: string;
      let negativePrompt: string;
      let headlineText: string;

      if (customPrompt) {
        prompt = customPrompt;
        negativePrompt = "text, words, letters, watermark, blurry, low quality";
        headlineText = customHeadline || post.hook.split(/[.!?]/)[0]?.trim() || "";
      } else {
        // Use LLM to generate image prompt from post content
        const generated = await generateImageIntent({
          hook: post.hook,
          body_beats: post.bodyBeats || [],
          full_text: post.fullText,
        });
        prompt = generated.prompt;
        negativePrompt = generated.negative_prompt;
        headlineText = generated.headline_text;
      }

      const intentId = crypto.randomUUID();
      await db.insert(imageIntents).values({
        id: intentId,
        postId: postId,
        prompt,
        negativePrompt,
        headlineText,
        stylePreset: "typographic_minimal",
      });

      intent = await db.query.imageIntents.findFirst({
        where: eq(imageIntents.id, intentId),
      });
    }

    if (!intent) {
      return NextResponse.json({ error: "Failed to create image intent" }, { status: 500 });
    }

    // Apply brand style if available
    let finalPrompt = intent.prompt;
    let finalNegativePrompt = intent.negativePrompt;

    const brandStyle = await getActiveBrandStyle(user.id);
    if (brandStyle) {
      console.log(`[PostImage] Applying brand style "${brandStyle.name}"`);
      finalPrompt = composePromptWithBrandStyle(intent.prompt, brandStyle);
      finalNegativePrompt = composeNegativeWithBrandStyle(intent.negativePrompt || "", brandStyle);
    }

    // Generate the image using LinkedIn-optimized dimensions
    const sizeKey = imageSize || DEFAULT_POST_IMAGE_SIZE;
    const postDimensions = getPostImageDimensions(sizeKey);
    const result = await generateImage(
      {
        prompt: finalPrompt,
        negativePrompt: finalNegativePrompt,
        headlineText: "",
        stylePreset: intent.stylePreset as StylePreset,
        aspectRatio: postDimensions.aspectRatio,
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
        .where(eq(imageIntents.id, intent.id));

      return NextResponse.json(
        { success: false, error: result.error, provider: result.provider },
        { status: 500 }
      );
    }

    // Overlay headline text
    let finalImageUrl = result.imageUrl;

    if (intent.headlineText) {
      try {
        console.log(`[PostImage] Overlaying headline text...`);
        const compositedBuffer = await overlayCoverTextFromUrl(result.imageUrl, {
          headline: intent.headlineText,
          width: postDimensions.width,
          height: postDimensions.height,
        });

        const filename = `post-cover-${intent.id}.png`;
        finalImageUrl = await uploadImage(compositedBuffer, filename, "image/png");
      } catch (overlayError) {
        console.error("[PostImage] Text overlay failed:", overlayError);
      }
    }

    // Update database
    await db
      .update(imageIntents)
      .set({
        generatedImageUrl: finalImageUrl,
        generatedAt: new Date(),
        generationProvider: result.provider,
        generationError: null,
      })
      .where(eq(imageIntents.id, intent.id));

    // Increment usage
    await incrementImageUsage(user.id, 1);

    return NextResponse.json({
      success: true,
      intentId: intent.id,
      imageUrl: finalImageUrl,
      provider: result.provider,
    });
  } catch (error) {
    console.error("Generate post image error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
