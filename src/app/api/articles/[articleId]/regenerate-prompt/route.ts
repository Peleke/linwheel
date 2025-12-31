import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articles, articleImageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateArticleImageIntent } from "@/lib/generate";
import { randomUUID } from "crypto";

interface RouteParams {
  params: Promise<{ articleId: string }>;
}

/**
 * POST /api/articles/[articleId]/regenerate-prompt
 *
 * Regenerates the image intent prompt for an article using the LLM
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { articleId } = await params;

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

    // Generate new image intent
    console.log(`[API] Regenerating prompt for article ${articleId}`);
    const newIntent = await generateArticleImageIntent({
      title: article.title,
      subtitle: article.subtitle,
      introduction: article.introduction,
      sections,
    });

    // Check if article already has an image intent
    const existingIntent = await db.query.articleImageIntents.findFirst({
      where: eq(articleImageIntents.articleId, articleId),
    });

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
