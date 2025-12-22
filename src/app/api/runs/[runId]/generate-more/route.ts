import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { generationRuns, insights, linkedinPosts, imageIntents, POST_ANGLES, type PostAngle } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { runPipeline } from "@/lib/generate";
import { randomUUID } from "crypto";

interface RouteParams {
  params: Promise<{ runId: string }>;
}

/**
 * POST /api/runs/[runId]/generate-more
 * Generate additional posts for a specific angle
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { runId } = await params;
    const body = await request.json();
    const { angle, count = 2 } = body;

    // Validate angle
    if (!POST_ANGLES.includes(angle)) {
      return NextResponse.json({ error: "Invalid angle" }, { status: 400 });
    }

    // Get the run with transcript
    const run = await db.query.generationRuns.findFirst({
      where: eq(generationRuns.id, runId),
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    if (!run.transcript) {
      return NextResponse.json(
        { error: "No transcript available for regeneration" },
        { status: 400 }
      );
    }

    // Get existing posts for this angle to determine next version number
    const existingPosts = await db.query.linkedinPosts.findMany({
      where: and(
        eq(linkedinPosts.runId, runId),
        eq(linkedinPosts.postType, angle)
      ),
    });
    const maxVersion = Math.max(0, ...existingPosts.map(p => p.versionNumber ?? 0));

    // Get an existing insight for this run (we'll reuse it)
    const existingInsight = await db.query.insights.findFirst({
      where: eq(insights.runId, runId),
    });

    if (!existingInsight) {
      return NextResponse.json(
        { error: "No insights found for this run" },
        { status: 400 }
      );
    }

    // Generate new posts for just this angle
    const result = await runPipeline(run.transcript, {
      maxInsights: 1, // We already have insights
      selectedAngles: [angle as PostAngle],
      versionsPerAngle: count,
    });

    // Save the new posts
    let savedCount = 0;
    for (const post of result.posts) {
      if (!post.full_text && !post.hook) {
        continue;
      }

      const postId = randomUUID();
      const hook = (
        post.hook?.trim() ||
        post.full_text?.split("\n").find(line => line.trim())?.trim() ||
        `${post.angle} post`
      );
      const fullText = post.full_text?.trim() || hook;

      await db.insert(linkedinPosts).values({
        id: postId,
        insightId: existingInsight.id,
        runId,
        hook,
        bodyBeats: post.body_beats || [],
        openQuestion: post.open_question || "",
        postType: angle as PostAngle,
        fullText,
        versionNumber: maxVersion + savedCount + 1,
        approved: false,
      });

      if (post.imageIntent?.prompt && post.imageIntent?.headline_text) {
        await db.insert(imageIntents).values({
          id: randomUUID(),
          postId,
          prompt: post.imageIntent.prompt,
          negativePrompt: post.imageIntent.negative_prompt || "",
          headlineText: post.imageIntent.headline_text,
          stylePreset: post.imageIntent.style_preset || "typographic_minimal",
        });
      }

      savedCount++;
    }

    // Update post count
    const totalPosts = await db.query.linkedinPosts.findMany({
      where: eq(linkedinPosts.runId, runId),
      columns: { id: true },
    });
    await db
      .update(generationRuns)
      .set({ postCount: totalPosts.length })
      .where(eq(generationRuns.id, runId));

    return NextResponse.json({ generated: savedCount });
  } catch (error) {
    console.error("Error generating more:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate more" },
      { status: 500 }
    );
  }
}
