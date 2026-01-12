/**
 * POST /api/posts - Create a new manual post draft
 *
 * Creates a manual draft post (not AI-generated).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { linkedinPosts } from "@/db/schema";
import { requireAuth } from "@/lib/auth";

interface CreatePostBody {
  fullText: string;
  hook?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Require authenticated user
    let user;
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as CreatePostBody;
    const { fullText, hook } = body;

    if (!fullText || fullText.trim().length === 0) {
      return NextResponse.json(
        { error: "Post content is required" },
        { status: 400 }
      );
    }

    // LinkedIn has a 3000 character limit for posts
    if (fullText.length > 3000) {
      return NextResponse.json(
        { error: "Post exceeds 3000 character limit" },
        { status: 400 }
      );
    }

    // Extract hook from first line if not provided
    const extractedHook = hook || fullText.split("\n")[0]?.trim() || fullText.slice(0, 100);

    // Create the manual draft
    const postId = crypto.randomUUID();

    await db.insert(linkedinPosts).values({
      id: postId,
      // No runId or insightId for manual drafts
      runId: null,
      insightId: null,
      // Store userId directly on post for manual drafts (required for auto-publish)
      userId: user.id,
      hook: extractedHook,
      bodyBeats: [], // Not applicable for manual drafts
      openQuestion: "", // Not applicable for manual drafts
      postType: "field_note", // Default type for manual drafts
      fullText: fullText.trim(),
      versionNumber: 1,
      approved: true, // Manual drafts are auto-approved since user wrote them
      isManualDraft: true,
      autoPublish: true,
    });

    return NextResponse.json({
      success: true,
      postId,
      message: "Draft created successfully",
    });
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}
