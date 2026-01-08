import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articles, articleImageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateArticleImageIntent, regenerateArticleImageIntent } from "@/lib/generate";
import { randomUUID } from "crypto";

interface RouteParams {
  params: Promise<{ articleId: string }>;
}

/**
 * POST /api/articles/[articleId]/regenerate-prompt
 *
 * Regenerates the image intent prompt for an article using the LLM.
 * Optionally accepts feedback to guide the regeneration.
 *
 * Body: { feedback?: string }
 * - If feedback is provided and an intent exists, regenerates WITH feedback
 * - If no feedback, generates fresh from article content
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { articleId } = await params;

    // Parse optional feedback from request body
    let feedback: string | undefined;
    try {
      const body = await request.json();
      feedback = body.feedback;
    } catch {
      // No body or invalid JSON, that's fine
    }

    // Fetch the article
    const article = await db.query.articles.findFirst({
      where: eq(articles.id, articleId),
    });

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    // Parse sections if it's a string
    const sections = typeof article.sections === "string"
      ? JSON.parse(article.sections)
      : article.sections || [];

    // Check if article already has an image intent
    const existingIntent = await db.query.articleImageIntents.findFirst({
      where: eq(articleImageIntents.articleId, articleId),
    });

    // Generate or regenerate image intent
    let newIntent;
    if (feedback && existingIntent) {
      // Regenerate with feedback using existing intent as base
      console.log(`[API] Regenerating prompt for article ${articleId} with feedback: "${feedback}"`);
      newIntent = await regenerateArticleImageIntent(
        {
          title: article.title,
          subtitle: article.subtitle,
          introduction: article.introduction,
          sections,
        },
        {
          prompt: existingIntent.prompt,
          negativePrompt: existingIntent.negativePrompt,
          headlineText: existingIntent.headlineText,
          stylePreset: existingIntent.stylePreset,
        },
        feedback
      );
    } else {
      // Fresh generation
      console.log(`[API] Generating fresh prompt for article ${articleId}`);
      newIntent = await generateArticleImageIntent({
        title: article.title,
        subtitle: article.subtitle,
        introduction: article.introduction,
        sections,
      });
    }

    if (existingIntent) {
      // Update existing intent
      await db
        .update(articleImageIntents)
        .set({
          prompt: newIntent.prompt,
          negativePrompt: newIntent.negative_prompt,
          headlineText: newIntent.headline_text,
          stylePreset: newIntent.style_preset,
          // Clear generated image since prompt changed
          generatedImageUrl: null,
          generatedAt: null,
          generationError: null,
        })
        .where(eq(articleImageIntents.id, existingIntent.id));

      return NextResponse.json({
        success: true,
        intentId: existingIntent.id,
        intent: {
          prompt: newIntent.prompt,
          negativePrompt: newIntent.negative_prompt,
          headlineText: newIntent.headline_text,
          stylePreset: newIntent.style_preset,
        },
      });
    } else {
      // Create new intent
      const [created] = await db
        .insert(articleImageIntents)
        .values({
          id: randomUUID(),
          articleId,
          prompt: newIntent.prompt,
          negativePrompt: newIntent.negative_prompt,
          headlineText: newIntent.headline_text,
          stylePreset: newIntent.style_preset,
        })
        .returning();

      return NextResponse.json({
        success: true,
        intentId: created.id,
        intent: {
          prompt: newIntent.prompt,
          negativePrompt: newIntent.negative_prompt,
          headlineText: newIntent.headline_text,
          stylePreset: newIntent.style_preset,
        },
      });
    }
  } catch (error) {
    console.error("Error regenerating prompt:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
