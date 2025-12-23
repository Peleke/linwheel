import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  generationRuns, insights, articles, articleImageIntents,
  ARTICLE_ANGLES, type ArticleAngle
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { runPipeline } from "@/lib/generate";
import { randomUUID } from "crypto";

interface RouteParams {
  params: Promise<{ runId: string }>;
}

/**
 * POST /api/runs/[runId]/generate-more-articles
 * Generate additional articles for a specific article angle
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { runId } = await params;
    const body = await request.json();
    const { angle, count = 1 } = body;

    // Validate angle
    if (!ARTICLE_ANGLES.includes(angle)) {
      return NextResponse.json({ error: "Invalid article angle" }, { status: 400 });
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

    // Get existing articles for this angle to determine next version number
    const existingArticles = await db.query.articles.findMany({
      where: and(
        eq(articles.runId, runId),
        eq(articles.articleType, angle)
      ),
    });
    const maxVersion = Math.max(0, ...existingArticles.map(a => a.versionNumber ?? 0));

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

    // Generate new articles for just this angle
    const result = await runPipeline(run.transcript, {
      maxInsights: 1,
      selectedAngles: [], // No posts
      selectedArticleAngles: [angle as ArticleAngle],
      articleVersionsPerAngle: count,
    });

    // Save the new articles
    let savedCount = 0;
    for (const article of result.articles) {
      if (!article.full_text && !article.title) {
        continue;
      }

      const articleId = randomUUID();

      await db.insert(articles).values({
        id: articleId,
        insightId: existingInsight.id,
        runId,
        articleType: angle as ArticleAngle,
        title: article.title || `${article.angle} article`,
        subtitle: article.subtitle || null,
        introduction: article.introduction || "",
        sections: article.sections || [],
        conclusion: article.conclusion || "",
        fullText: article.full_text || article.title,
        versionNumber: maxVersion + savedCount + 1,
        approved: false,
      });

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

      savedCount++;
    }

    // Update article count
    const totalArticles = await db.query.articles.findMany({
      where: eq(articles.runId, runId),
      columns: { id: true },
    });
    await db
      .update(generationRuns)
      .set({ articleCount: totalArticles.length })
      .where(eq(generationRuns.id, runId));

    return NextResponse.json({ generated: savedCount });
  } catch (error) {
    console.error("Error generating more articles:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate more articles" },
      { status: 500 }
    );
  }
}
