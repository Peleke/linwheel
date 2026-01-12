/**
 * GET/PATCH /api/posts/[postId] - Get or update a post
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { linkedinPosts, imageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Require authenticated user
    try {
      await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await params;

    // Get the post with image intent
    const post = await db
      .select()
      .from(linkedinPosts)
      .where(eq(linkedinPosts.id, postId))
      .limit(1);

    if (post.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const postData = post[0];

    // Get image intent if exists
    const intent = await db
      .select()
      .from(imageIntents)
      .where(eq(imageIntents.postId, postId))
      .limit(1);

    return NextResponse.json({
      id: postData.id,
      hook: postData.hook,
      fullText: postData.fullText,
      postType: postData.postType,
      approved: postData.approved,
      isManualDraft: postData.isManualDraft,
      autoPublish: postData.autoPublish,
      scheduledAt: postData.scheduledAt?.toISOString() ?? null,
      linkedinPostUrn: postData.linkedinPostUrn,
      linkedinPublishedAt: postData.linkedinPublishedAt?.toISOString() ?? null,
      imageIntent: intent.length > 0
        ? {
            id: intent[0].id,
            headlineText: intent[0].headlineText,
            prompt: intent[0].prompt,
            generatedImageUrl: intent[0].generatedImageUrl,
          }
        : null,
    });
  } catch (error) {
    console.error("Get post error:", error);
    return NextResponse.json(
      { error: "Failed to get post" },
      { status: 500 }
    );
  }
}

interface UpdatePostBody {
  fullText?: string;
  hook?: string;
  autoPublish?: boolean;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Require authenticated user
    try {
      await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await params;
    const body = (await request.json()) as UpdatePostBody;

    // Check post exists
    const post = await db
      .select()
      .from(linkedinPosts)
      .where(eq(linkedinPosts.id, postId))
      .limit(1);

    if (post.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if already published
    if (post[0].linkedinPostUrn) {
      return NextResponse.json(
        { error: "Cannot edit a published post" },
        { status: 400 }
      );
    }

    // Build update object
    const updates: Partial<typeof linkedinPosts.$inferInsert> = {};

    if (body.fullText !== undefined) {
      if (body.fullText.length > 3000) {
        return NextResponse.json(
          { error: "Post exceeds 3000 character limit" },
          { status: 400 }
        );
      }
      updates.fullText = body.fullText.trim();
      // Update hook if fullText changed
      updates.hook = body.hook || body.fullText.split("\n")[0]?.trim() || body.fullText.slice(0, 100);
    }

    if (body.autoPublish !== undefined) {
      updates.autoPublish = body.autoPublish;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    await db
      .update(linkedinPosts)
      .set(updates)
      .where(eq(linkedinPosts.id, postId));

    return NextResponse.json({
      success: true,
      message: "Post updated successfully",
    });
  } catch (error) {
    console.error("Update post error:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}
