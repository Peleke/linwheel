/**
 * Article Carousel API
 *
 * POST /api/articles/[articleId]/carousel - Generate carousel
 * PATCH /api/articles/[articleId]/carousel - Regenerate a single slide
 * GET /api/articles/[articleId]/carousel - Get carousel status
 * DELETE /api/articles/[articleId]/carousel - Delete carousel
 */

import { NextResponse } from "next/server";
import { generateCarousel, getCarouselStatus, deleteCarousel, regenerateCarouselSlide } from "@/lib/carousel";
import type { T2IProviderType, StylePreset } from "@/lib/t2i/types";
import { getCurrentUser } from "@/lib/auth";
import { incrementImageUsage, canGenerateImages } from "@/lib/usage";

interface CarouselRequest {
  /** Override the default T2I provider */
  provider?: T2IProviderType;
  /** Model to use (e.g., 'flux-dev', 'gpt-image-1') */
  model?: string;
  /** Style preset for the carousel */
  stylePreset?: StylePreset;
  /** Force regeneration, bypassing cache */
  forceRegenerate?: boolean;
}

interface SlideRegenerateRequest {
  /** Which slide to regenerate (1-indexed) */
  slideNumber: number;
  /** Override the default T2I provider */
  provider?: T2IProviderType;
  /** Model to use */
  model?: string;
  /** Custom prompt for this slide */
  customPrompt?: string;
  /** Whether to regenerate the prompt via LLM */
  regeneratePrompt?: boolean;
}

/**
 * POST - Generate a carousel for an article
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params;
    const body = (await request.json().catch(() => ({}))) as CarouselRequest;

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

    const action = body.forceRegenerate ? "Regenerating" : "Generating";
    console.log(`[API] ${action} carousel for article ${articleId} with provider: ${body.provider || 'default'}`);

    const result = await generateCarousel(articleId, {
      provider: body.provider,
      model: body.model,
      stylePreset: body.stylePreset,
      forceRegenerate: body.forceRegenerate,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Article not found" ? 404 : 500 }
      );
    }

    // Increment image usage after successful generation (5 slides per carousel)
    const slideCount = result.pages?.length || 5;
    if (user) {
      await incrementImageUsage(user.id, slideCount);
    }

    return NextResponse.json({
      success: true,
      carouselId: result.carouselId,
      pdfUrl: result.pdfUrl,
      pageCount: result.pages?.length || 0,
      pages: result.pages,
      provider: result.provider,
    });
  } catch (error) {
    console.error("[API] Carousel generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Carousel generation failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete carousel for an article
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params;

    console.log(`[API] Deleting carousel for article ${articleId}`);

    const result = await deleteCarousel(articleId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Carousel not found" ? 404 : 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Carousel delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Regenerate a single slide in the carousel
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params;
    const body = (await request.json().catch(() => ({}))) as SlideRegenerateRequest;

    if (!body.slideNumber || typeof body.slideNumber !== "number") {
      return NextResponse.json(
        { error: "slideNumber is required and must be a number" },
        { status: 400 }
      );
    }

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

    console.log(`[API] Regenerating slide ${body.slideNumber} for article ${articleId}`);

    const result = await regenerateCarouselSlide(articleId, body.slideNumber, {
      provider: body.provider,
      model: body.model,
      customPrompt: body.customPrompt,
      regeneratePrompt: body.regeneratePrompt,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.includes("not found") ? 404 : 500 }
      );
    }

    // Increment image usage after successful slide regeneration (1 image)
    if (user) {
      await incrementImageUsage(user.id, 1);
    }

    return NextResponse.json({
      success: true,
      carouselId: result.carouselId,
      pdfUrl: result.pdfUrl,
      pages: result.pages,
      regeneratedSlide: body.slideNumber,
      provider: result.provider,
    });
  } catch (error) {
    console.error("[API] Slide regeneration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Slide regeneration failed" },
      { status: 500 }
    );
  }
}

/**
 * GET - Get carousel status for an article
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params;

    const status = await getCarouselStatus(articleId);

    if (!status.exists) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      id: status.id,
      pageCount: status.pageCount,
      pages: status.pages,
      pdfUrl: status.pdfUrl,
      generatedAt: status.generatedAt,
      provider: status.provider,
      error: status.error,
    });
  } catch (error) {
    console.error("[API] Carousel status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get carousel status" },
      { status: 500 }
    );
  }
}
