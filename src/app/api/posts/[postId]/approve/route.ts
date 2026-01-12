import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { linkedinPosts, imageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Props {
  params: Promise<{ postId: string }>;
}

/**
 * POST /api/posts/[postId]/approve
 *
 * Approves or unapproves a post. Does NOT trigger image generation.
 * Image generation is now a separate action via the Generate Image modal.
 */
export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { postId } = await params;
    const body = await request.json();
    const { approved } = body as { approved: boolean };

    if (typeof approved !== "boolean") {
      return NextResponse.json(
        { error: "approved must be a boolean" },
        { status: 400 }
      );
    }

    // Update post approval status
    console.log(`[Approve] Updating post ${postId} to approved=${approved}`);

    const result = await db
      .update(linkedinPosts)
      .set({ approved })
      .where(eq(linkedinPosts.id, postId))
      .returning({ id: linkedinPosts.id });

    console.log(`[Approve] Update result:`, result);

    if (result.length === 0) {
      console.log(`[Approve] Post not found: ${postId}`);
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    console.log(`[Approve] Successfully updated post ${postId}`);

    // Get image intent status (but don't generate)
    let imageIntent = null;
    const intent = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.postId, postId),
    });

    if (intent) {
      imageIntent = {
        intentId: intent.id,
        hasImage: !!intent.generatedImageUrl,
        imageUrl: intent.generatedImageUrl,
      };
    }

    return NextResponse.json({ success: true, approved, imageIntent });
  } catch (error) {
    console.error("Error updating approval:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
