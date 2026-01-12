import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { linkedinPosts } from "@/db/schema";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

/**
 * PATCH /api/posts/[postId]/schedule
 *
 * Updates the scheduled date and auto-publish setting for a post
 * Body: { scheduledAt: string | null, autoPublish?: boolean }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { postId } = await params;
    const body = await request.json();
    const { scheduledAt, autoPublish } = body as {
      scheduledAt: string | null;
      autoPublish?: boolean;
    };

    // Check post exists
    const post = await db.query.linkedinPosts.findFirst({
      where: eq(linkedinPosts.id, postId),
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updates: { scheduledAt: Date | null; autoPublish?: boolean } = {
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    };

    // Only update autoPublish if explicitly provided
    if (typeof autoPublish === "boolean") {
      updates.autoPublish = autoPublish;
    }

    // Update the schedule
    await db
      .update(linkedinPosts)
      .set(updates)
      .where(eq(linkedinPosts.id, postId));

    return NextResponse.json({
      success: true,
      postId,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      autoPublish: typeof autoPublish === "boolean" ? autoPublish : post.autoPublish,
    });
  } catch (error) {
    console.error("Error scheduling post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/posts/[postId]/schedule
 *
 * Returns the schedule info for a post
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { postId } = await params;

    const post = await db.query.linkedinPosts.findFirst({
      where: eq(linkedinPosts.id, postId),
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      postId,
      scheduledAt: post.scheduledAt,
      scheduledPosition: post.scheduledPosition,
    });
  } catch (error) {
    console.error("Error fetching post schedule:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
