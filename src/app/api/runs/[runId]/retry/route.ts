import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { generationRuns, insights, linkedinPosts, imageIntents, type PostAngle } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { runPipeline } from "@/lib/generate";
import { randomUUID } from "crypto";

interface RouteParams {
  params: Promise<{ runId: string }>;
}

/**
 * Process generation with retry logic
 */
async function processWithRetry(
  runId: string,
  transcript: string,
  selectedAngles: PostAngle[]
) {
  try {
    await db
      .update(generationRuns)
      .set({ status: "processing", error: null })
      .where(eq(generationRuns.id, runId));

    const result = await runPipeline(transcript, {
      maxInsights: 3,
      selectedAngles,
      versionsPerAngle: 2,
    });

    // Check if run still exists
    const runStillExists = await db.query.generationRuns.findFirst({
      where: eq(generationRuns.id, runId),
      columns: { id: true },
    });
    if (!runStillExists) {
      console.log(`Run ${runId} was deleted during generation, aborting save`);
      return;
    }

    // Save insights
    const insightRecords: { id: string; claim: string }[] = [];
    for (const insight of result.insights) {
      const insightId = randomUUID();
      await db.insert(insights).values({
        id: insightId,
        runId,
        topic: insight.topic,
        claim: insight.claim,
        whyItMatters: insight.why_it_matters,
        misconception: insight.misconception,
        professionalImplication: insight.professional_implication,
      });
      insightRecords.push({ id: insightId, claim: insight.claim });
    }

    // Save posts and image intents
    for (const post of result.posts) {
      if (!post.full_text && !post.hook) {
        console.warn(`Skipping post for ${post.angle} - missing full_text and hook`);
        continue;
      }

      const postId = randomUUID();
      const insightRecord = insightRecords.find(
        (i) => i.claim === post.insight.claim
      );

      const hook = (
        post.hook?.trim() ||
        post.full_text?.split("\n").find(line => line.trim())?.trim() ||
        `${post.angle} post`
      );
      const fullText = post.full_text?.trim() || hook;

      await db.insert(linkedinPosts).values({
        id: postId,
        insightId: insightRecord?.id || randomUUID(),
        runId,
        hook,
        bodyBeats: post.body_beats || [],
        openQuestion: post.open_question || "",
        postType: post.angle,
        fullText,
        versionNumber: post.versionNumber,
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
    }

    await db
      .update(generationRuns)
      .set({ status: "complete", postCount: result.posts.length })
      .where(eq(generationRuns.id, runId));

  } catch (error) {
    console.error("Pipeline error:", error);
    await db
      .update(generationRuns)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(generationRuns.id, runId));
  }
}

/**
 * POST /api/runs/[runId]/retry - Retry a failed generation
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { runId } = await params;

    // Get the run
    const run = await db.query.generationRuns.findFirst({
      where: eq(generationRuns.id, runId),
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    if (run.status !== "failed") {
      return NextResponse.json(
        { error: "Can only retry failed runs" },
        { status: 400 }
      );
    }

    if (!run.transcript) {
      return NextResponse.json(
        { error: "No transcript available for retry" },
        { status: 400 }
      );
    }

    // Clear any existing data from the failed run
    const existingPosts = await db.query.linkedinPosts.findMany({
      where: eq(linkedinPosts.runId, runId),
      columns: { id: true },
    });
    const postIds = existingPosts.map((p) => p.id);

    if (postIds.length > 0) {
      await db.delete(imageIntents).where(inArray(imageIntents.postId, postIds));
      await db.delete(linkedinPosts).where(eq(linkedinPosts.runId, runId));
    }
    await db.delete(insights).where(eq(insights.runId, runId));

    // Fire-and-forget retry
    processWithRetry(
      runId,
      run.transcript,
      run.selectedAngles || []
    ).catch((err) => {
      console.error("Background retry error:", err);
    });

    return NextResponse.json({ retrying: true });
  } catch (error) {
    console.error("Error retrying:", error);
    return NextResponse.json(
      { error: "Failed to retry generation" },
      { status: 500 }
    );
  }
}
