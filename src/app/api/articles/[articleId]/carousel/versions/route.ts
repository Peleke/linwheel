/**
 * Carousel Slide Versions API
 *
 * GET /api/articles/[articleId]/carousel/versions?slide=N - Get versions for a slide
 * POST /api/articles/[articleId]/carousel/versions - Activate a specific version
 */

import { NextResponse } from "next/server";
import { getCarouselStatus, getSlideVersions, activateSlideVersion } from "@/lib/carousel";

interface ActivateVersionRequest {
  slideNumber: number;
  versionId: string;
}

/**
 * GET - Get all versions for a specific slide
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params;
    const { searchParams } = new URL(request.url);
    const slideNumber = parseInt(searchParams.get("slide") || "0");

    if (!slideNumber || slideNumber < 1 || slideNumber > 5) {
      return NextResponse.json(
        { error: "Invalid slide number. Must be 1-5." },
        { status: 400 }
      );
    }

    // Get carousel to find the intent ID
    const status = await getCarouselStatus(articleId);
    if (!status.exists || !status.id) {
      return NextResponse.json(
        { error: "Carousel not found" },
        { status: 404 }
      );
    }

    const versions = await getSlideVersions(status.id, slideNumber);

    // Find the active version ID
    const activeVersion = versions.find((v) => v.isActive);

    return NextResponse.json({
      versions,
      activeVersionId: activeVersion?.id,
      slideNumber,
    });
  } catch (error) {
    console.error("[API] Get versions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get versions" },
      { status: 500 }
    );
  }
}

/**
 * POST - Activate a specific version for a slide
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params;
    const body = (await request.json().catch(() => ({}))) as ActivateVersionRequest;

    if (!body.slideNumber || typeof body.slideNumber !== "number") {
      return NextResponse.json(
        { error: "slideNumber is required and must be a number" },
        { status: 400 }
      );
    }

    if (!body.versionId || typeof body.versionId !== "string") {
      return NextResponse.json(
        { error: "versionId is required and must be a string" },
        { status: 400 }
      );
    }

    // Get carousel to find the intent ID
    const status = await getCarouselStatus(articleId);
    if (!status.exists || !status.id) {
      return NextResponse.json(
        { error: "Carousel not found" },
        { status: 404 }
      );
    }

    console.log(`[API] Activating version ${body.versionId} for slide ${body.slideNumber}`);

    const result = await activateSlideVersion(status.id, body.slideNumber, body.versionId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      pages: result.pages,
      pdfUrl: result.pdfUrl,
      activatedSlide: body.slideNumber,
      activatedVersionId: body.versionId,
    });
  } catch (error) {
    console.error("[API] Activate version error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to activate version" },
      { status: 500 }
    );
  }
}
