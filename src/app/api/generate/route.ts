import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { generationRuns, insights, linkedinPosts, imageIntents, POST_ANGLES, type PostAngle } from "@/db/schema";
import { eq } from "drizzle-orm";
import { runPipeline } from "@/lib/generate";
import { randomUUID } from "crypto";

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

    // Create run record
    const runId = randomUUID();
    await db.insert(generationRuns).values({
      id: runId,
      createdAt: new Date(),
      sourceLabel: sourceLabel || "Untitled",
      status: "processing",
      selectedAngles,
    });

    // Run pipeline (synchronously for MVP; would be background job in production)
    try {
      const result = await runPipeline(transcript, {
        maxInsights: 3,
        selectedAngles,
        versionsPerAngle: 5,
      });

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

        await db.insert(linkedinPosts).values({
          id: postId,
          insightId: insightRecord?.id || randomUUID(),
          runId,
          hook: post.hook,
          bodyBeats: post.body_beats,
          openQuestion: post.open_question,
          postType: post.angle, // angle is now the post type
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
          // Legacy fields (still NOT NULL in DB, will remove in future migration)
          visualStyle: "",
          background: "",
          mood: "",
          layoutHint: "",
        });
      }

      // Update run status
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

    return NextResponse.json({ runId });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
