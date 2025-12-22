import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { generationRuns, linkedinPosts, imageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;

    // Fetch run
    const run = await db.query.generationRuns.findFirst({
      where: eq(generationRuns.id, runId),
    });

    if (!run) {
      return NextResponse.json(
        { error: "Run not found" },
        { status: 404 }
      );
    }

    // Fetch posts
    const posts = await db.query.linkedinPosts.findMany({
      where: eq(linkedinPosts.runId, runId),
    });

    // Fetch image intents for each post
    const postsWithIntents = await Promise.all(
      posts.map(async (post) => {
        const intent = await db.query.imageIntents.findFirst({
          where: eq(imageIntents.postId, post.id),
        });
        return { ...post, imageIntent: intent };
      })
    );

    return NextResponse.json({
      run,
      posts: postsWithIntents,
    });
  } catch (error) {
    console.error("Results error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
