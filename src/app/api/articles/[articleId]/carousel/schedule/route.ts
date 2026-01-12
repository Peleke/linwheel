/**
 * Article Carousel Schedule API
 *
 * POST /api/articles/[articleId]/carousel/schedule - Schedule carousel publication
 * GET /api/articles/[articleId]/carousel/schedule - Get carousel schedule
 * DELETE /api/articles/[articleId]/carousel/schedule - Remove carousel schedule
 *
 * Allows scheduling article carousels to publish as LinkedIn posts either:
 * - At the same time as the article (shared schedule)
 * - N days after the article (offset schedule)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articles, articleCarouselIntents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ articleId: string }>;
}

interface ScheduleCarouselRequest {
  /** Use shared schedule (same time as article) */
  sharedSchedule?: boolean;
  /** Days after article to publish carousel (ignored if sharedSchedule is true) */
  offsetDays?: number;
  /** Explicit scheduled date/time (overrides both sharedSchedule and offsetDays) */
  scheduledAt?: string;
  /** Whether to auto-publish when scheduled time arrives */
  autoPublish?: boolean;
}

/**
 * POST - Schedule a carousel for publication
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Require authenticated user
    try {
      await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { articleId } = await params;
    const body = (await request.json()) as ScheduleCarouselRequest;

    // Get the article to check it exists and get its schedule
    const article = await db.query.articles.findFirst({
      where: eq(articles.id, articleId),
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Get the carousel intent
    const carouselIntent = await db.query.articleCarouselIntents.findFirst({
      where: eq(articleCarouselIntents.articleId, articleId),
    });

    if (!carouselIntent) {
      return NextResponse.json(
        { error: "Carousel not found. Generate a carousel first." },
        { status: 404 }
      );
    }

    // Check carousel has been generated
    if (!carouselIntent.generatedPdfUrl && (!carouselIntent.pages || carouselIntent.pages.length === 0)) {
      return NextResponse.json(
        { error: "Carousel not ready. Generate the carousel first." },
        { status: 400 }
      );
    }

    // Calculate scheduled time
    let scheduledAt: Date | null = null;
    let offsetDays = 0;

    if (body.scheduledAt) {
      // Explicit scheduled time provided
      scheduledAt = new Date(body.scheduledAt);
      if (isNaN(scheduledAt.getTime())) {
        return NextResponse.json(
          { error: "Invalid scheduledAt date" },
          { status: 400 }
        );
      }
    } else if (body.sharedSchedule) {
      // Use article's schedule
      if (!article.scheduledAt) {
        return NextResponse.json(
          { error: "Article is not scheduled. Schedule the article first or provide an explicit date." },
          { status: 400 }
        );
      }
      scheduledAt = article.scheduledAt;
      offsetDays = 0;
    } else if (body.offsetDays !== undefined && body.offsetDays >= 0) {
      // Calculate based on offset from article schedule
      if (!article.scheduledAt) {
        return NextResponse.json(
          { error: "Article is not scheduled. Schedule the article first or provide an explicit date." },
          { status: 400 }
        );
      }
      offsetDays = body.offsetDays;
      scheduledAt = new Date(article.scheduledAt.getTime() + offsetDays * 24 * 60 * 60 * 1000);
    } else {
      return NextResponse.json(
        { error: "Provide sharedSchedule, offsetDays, or explicit scheduledAt" },
        { status: 400 }
      );
    }

    // Update carousel intent with schedule
    await db
      .update(articleCarouselIntents)
      .set({
        scheduledAt,
        offsetDays,
        autoPublish: body.autoPublish ?? true,
        status: "scheduled",
        publishError: null,
      })
      .where(eq(articleCarouselIntents.id, carouselIntent.id));

    return NextResponse.json({
      success: true,
      carouselId: carouselIntent.id,
      scheduledAt: scheduledAt.toISOString(),
      offsetDays,
      autoPublish: body.autoPublish ?? true,
      status: "scheduled",
    });
  } catch (error) {
    console.error("Schedule carousel error:", error);
    return NextResponse.json(
      { error: "Failed to schedule carousel" },
      { status: 500 }
    );
  }
}

/**
 * GET - Get carousel schedule info
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Require authenticated user
    try {
      await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { articleId } = await params;

    // Get the carousel intent
    const carouselIntent = await db.query.articleCarouselIntents.findFirst({
      where: eq(articleCarouselIntents.articleId, articleId),
    });

    if (!carouselIntent) {
      return NextResponse.json(
        { error: "Carousel not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      carouselId: carouselIntent.id,
      articleId,
      scheduledAt: carouselIntent.scheduledAt?.toISOString() || null,
      offsetDays: carouselIntent.offsetDays,
      autoPublish: carouselIntent.autoPublish,
      status: carouselIntent.status,
      linkedinPostUrn: carouselIntent.linkedinPostUrn,
      publishedAt: carouselIntent.publishedAt?.toISOString() || null,
      publishError: carouselIntent.publishError,
      isScheduled: carouselIntent.status === "scheduled",
      isPublished: carouselIntent.status === "published",
    });
  } catch (error) {
    console.error("Get carousel schedule error:", error);
    return NextResponse.json(
      { error: "Failed to get carousel schedule" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove carousel schedule (unschedule)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Require authenticated user
    try {
      await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { articleId } = await params;

    // Get the carousel intent
    const carouselIntent = await db.query.articleCarouselIntents.findFirst({
      where: eq(articleCarouselIntents.articleId, articleId),
    });

    if (!carouselIntent) {
      return NextResponse.json(
        { error: "Carousel not found" },
        { status: 404 }
      );
    }

    // Can't unschedule if already published
    if (carouselIntent.status === "published") {
      return NextResponse.json(
        { error: "Carousel already published. Cannot unschedule." },
        { status: 400 }
      );
    }

    // Remove schedule
    await db
      .update(articleCarouselIntents)
      .set({
        scheduledAt: null,
        offsetDays: 0,
        autoPublish: false,
        status: carouselIntent.generatedPdfUrl ? "ready" : "pending",
        publishError: null,
      })
      .where(eq(articleCarouselIntents.id, carouselIntent.id));

    return NextResponse.json({
      success: true,
      carouselId: carouselIntent.id,
      status: carouselIntent.generatedPdfUrl ? "ready" : "pending",
    });
  } catch (error) {
    console.error("Unschedule carousel error:", error);
    return NextResponse.json(
      { error: "Failed to unschedule carousel" },
      { status: 500 }
    );
  }
}
