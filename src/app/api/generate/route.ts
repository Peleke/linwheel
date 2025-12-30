import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/db";
import {
  generationRuns, insights, linkedinPosts, imageIntents,
  articles, articleImageIntents,
  POST_ANGLES, ARTICLE_ANGLES, type PostAngle, type ArticleAngle
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { runPipeline } from "@/lib/generate";
import { setLLMProvider, clearLLMProvider, type LLMProvider } from "@/lib/llm";
import { randomUUID } from "crypto";

/**
 * Process generation in background (fire-and-forget)
 * Updates database status as it progresses
 */
async function processGeneration(
  runId: string,
  transcript: string,
  selectedAngles: PostAngle[],
  selectedArticleAngles: ArticleAngle[] = [],
  llmProvider?: LLMProvider
) {
  try {
    // Set LLM provider for this request
    if (llmProvider) {
      console.log(`[Generate] Using client-requested provider: ${llmProvider}`);
      setLLMProvider(llmProvider);
    }
    // Update status to processing
    await db
      .update(generationRuns)
      .set({ status: "processing" })
      .where(eq(generationRuns.id, runId));

    const result = await runPipeline(transcript, {
      maxInsights: 3,
      selectedAngles,
      versionsPerAngle: 2, // Reduced from 5 to avoid rate limits
      selectedArticleAngles,
      articleVersionsPerAngle: 1, // 1 version per article angle
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

    // Save posts and image intents - update count after each for progressive rendering
    let savedPostCount = 0;
    for (const post of result.posts) {
      // Skip posts with missing required data
      if (!post.full_text && !post.hook) {
        console.warn(`Skipping post for ${post.angle} - missing full_text and hook`);
        continue;
      }

      const postId = randomUUID();
      const insightRecord = insightRecords.find(
        (i) => i.claim === post.insight.claim
      );

      // Robust hook extraction with multiple fallbacks
      const hook = (
        post.hook?.trim() ||
        post.full_text?.split("\n").find(line => line.trim())?.trim() ||
        `${post.angle} post`
      );

      // Ensure we have valid full_text
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

      // Only save image intent if we have the required data
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

      // Update post count for progressive rendering (every 5 posts to reduce DB writes)
      savedPostCount++;
      if (savedPostCount % 5 === 0) {
        await db
          .update(generationRuns)
          .set({ postCount: savedPostCount })
          .where(eq(generationRuns.id, runId));
      }
    }

    // Save articles and article image intents
    for (const article of result.articles) {
      // Skip articles with missing required data
      if (!article.full_text && !article.title) {
        console.warn(`Skipping article for ${article.angle} - missing full_text and title`);
        continue;
      }

      const articleId = randomUUID();
      const insightRecord = insightRecords.find(
        (i) => i.claim === article.insight.claim
      );

      await db.insert(articles).values({
        id: articleId,
        insightId: insightRecord?.id || randomUUID(),
        runId,
        articleType: article.angle,
        title: article.title || `${article.angle} article`,
        subtitle: article.subtitle || null,
        introduction: article.introduction || "",
        sections: article.sections || [],
        conclusion: article.conclusion || "",
        fullText: article.full_text || article.title,
        versionNumber: article.versionNumber,
        approved: false,
      });

      // Only save article image intent if we have the required data
      if (article.imageIntent?.prompt && article.imageIntent?.headline_text) {
        await db.insert(articleImageIntents).values({
          id: randomUUID(),
          articleId,
          prompt: article.imageIntent.prompt,
          negativePrompt: article.imageIntent.negative_prompt || "",
          headlineText: article.imageIntent.headline_text,
          stylePreset: article.imageIntent.style_preset || "typographic_minimal",
        });
      }
    }

    // Update run status to complete
    await db
      .update(generationRuns)
      .set({
        status: "complete",
        postCount: result.posts.length,
        articleCount: result.articles.length,
      })
      .where(eq(generationRuns.id, runId));

  } catch (pipelineError) {
    console.error("Pipeline error:", pipelineError);
    try {
      await db
        .update(generationRuns)
        .set({
          status: "failed",
          error: pipelineError instanceof Error ? pipelineError.message : "Unknown error",
        })
        .where(eq(generationRuns.id, runId));
      console.log(`[Generate] Marked run ${runId} as failed`);
    } catch (dbError) {
      console.error("Failed to update run status to failed:", dbError);
    }
  } finally {
    // Clear the provider override for next request
    clearLLMProvider();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      transcript,
      sourceLabel,
      selectedAngles: rawSelectedAngles,
      selectedArticleAngles: rawSelectedArticleAngles,
      llmProvider: rawLLMProvider,
    } = body;

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "Transcript is required" },
        { status: 400 }
      );
    }

    // Validate and filter selected angles (default to all for posts)
    const selectedAngles: PostAngle[] = Array.isArray(rawSelectedAngles)
      ? rawSelectedAngles.filter((a): a is PostAngle => POST_ANGLES.includes(a))
      : [...POST_ANGLES];

    // Validate and filter selected article angles (default to none)
    const selectedArticleAngles: ArticleAngle[] = Array.isArray(rawSelectedArticleAngles)
      ? rawSelectedArticleAngles.filter((a): a is ArticleAngle => ARTICLE_ANGLES.includes(a))
      : [];

    // Validate LLM provider preference
    const llmProvider: LLMProvider | undefined =
      rawLLMProvider === "claude" || rawLLMProvider === "openai" ? rawLLMProvider : undefined;

    // Create run record with pending status
    const runId = randomUUID();
    await db.insert(generationRuns).values({
      id: runId,
      createdAt: new Date(),
      sourceLabel: sourceLabel || "Untitled",
      transcript, // Store for display and regeneration
      status: "pending",
      selectedAngles,
      selectedArticleAngles: selectedArticleAngles.length > 0 ? selectedArticleAngles : null,
    });

    // Use Next.js after() to keep serverless function alive after response
    after(async () => {
      try {
        await processGeneration(runId, transcript, selectedAngles, selectedArticleAngles, llmProvider);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const errorStack = err instanceof Error ? err.stack : undefined;
        console.error("Background processing error:", errorMsg);
        console.error("Stack:", errorStack);
        // Ensure status is updated even if processGeneration's catch fails
        try {
          await db
            .update(generationRuns)
            .set({ status: "failed", error: `Crash: ${errorMsg.slice(0, 500)}` })
            .where(eq(generationRuns.id, runId));
        } catch (dbErr) {
          console.error("Failed to update run status:", dbErr);
        }
      }
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
