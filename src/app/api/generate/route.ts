import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { generationRuns, insights, linkedinPosts, imageIntents, POST_ANGLES, type PostAngle } from "@/db/schema";
import { eq } from "drizzle-orm";
import { runPipeline } from "@/lib/generate";
import { randomUUID } from "crypto";

/**
 * Process generation in background (fire-and-forget)
 * Updates database status as it progresses
 */
async function processGeneration(
  runId: string,
  transcript: string,
  selectedAngles: PostAngle[]
) {
  try {
    // Update status to processing
    await db
      .update(generationRuns)
      .set({ status: "processing" })
      .where(eq(generationRuns.id, runId));

    const result = await runPipeline(transcript, {
      maxInsights: 3,
      selectedAngles,
      versionsPerAngle: 2, // Reduced from 5 to avoid rate limits
    });

    // Check if run still exists (could be deleted by "Clear all")
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
      const postId = randomUUID();
      const insightRecord = insightRecords.find(
        (i) => i.claim === post.insight.claim
      );

      // Extract hook from full_text if missing (LLM sometimes omits it)
      const hook = post.hook || post.full_text.split("\n")[0] || "Untitled post";

      await db.insert(linkedinPosts).values({
        id: postId,
        insightId: insightRecord?.id || randomUUID(),
        runId,
        hook,
        bodyBeats: post.body_beats,
        openQuestion: post.open_question,
        postType: post.angle,
        fullText: post.full_text,
        versionNumber: post.versionNumber,
        approved: false,
      });

      await db.insert(imageIntents).values({
        id: randomUUID(),
        postId,
        prompt: post.imageIntent.prompt,
        negativePrompt: post.imageIntent.negative_prompt,
        headlineText: post.imageIntent.headline_text,
        stylePreset: post.imageIntent.style_preset,
      });
    }

    // Update run status to complete
    await db
      .update(generationRuns)
      .set({ status: "complete", postCount: result.posts.length })
      .where(eq(generationRuns.id, runId));

  } catch (pipelineError) {
    console.error("Pipeline error:", pipelineError);
    await db
      .update(generationRuns)
      .set({
        status: "failed",
        error: pipelineError instanceof Error ? pipelineError.message : "Unknown error",
      })
      .where(eq(generationRuns.id, runId));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, sourceLabel, selectedAngles: rawSelectedAngles } = body;

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "Transcript is required" },
        { status: 400 }
      );
    }

    // Validate and filter selected angles (default to all)
    const selectedAngles: PostAngle[] = Array.isArray(rawSelectedAngles)
      ? rawSelectedAngles.filter((a): a is PostAngle => POST_ANGLES.includes(a))
      : [...POST_ANGLES];

    // Create run record with pending status
    const runId = randomUUID();
    await db.insert(generationRuns).values({
      id: runId,
      createdAt: new Date(),
      sourceLabel: sourceLabel || "Untitled",
      status: "pending",
      selectedAngles,
    });

    // Fire-and-forget: start processing without awaiting
    // In serverless (Vercel), would use waitUntil() here
    processGeneration(runId, transcript, selectedAngles).catch((err) => {
      console.error("Background processing error:", err);
    });

    // Return immediately with runId
    return NextResponse.json({ runId });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
