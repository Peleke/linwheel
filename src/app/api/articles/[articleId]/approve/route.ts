import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articles, articleImageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateImage } from "@/lib/t2i";
import type { StylePreset } from "@/lib/t2i";

interface RouteParams {
  params: Promise<{ articleId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { articleId } = await params;
    const body = await request.json();
    const { approved } = body;

    if (typeof approved !== "boolean") {
      return NextResponse.json(
        { error: "approved must be a boolean" },
        { status: 400 }
      );
    }

    // Check if article exists
    const article = await db.query.articles.findFirst({
      where: eq(articles.id, articleId),
    });

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    // Update approval status
    await db
      .update(articles)
      .set({ approved })
      .where(eq(articles.id, articleId));

    // If approving, trigger image generation
    let imageResult = null;
    if (approved) {
      const intent = await db.query.articleImageIntents.findFirst({
        where: eq(articleImageIntents.articleId, articleId),
      });

      if (intent && !intent.generatedImageUrl) {
        // Generate image asynchronously (don't block the response)
        generateImage({
          prompt: intent.prompt,
          negativePrompt: intent.negativePrompt,
          headlineText: intent.headlineText,
          stylePreset: intent.stylePreset as StylePreset,
          aspectRatio: "1.91:1",
          quality: "hd",
        }).then(async (genResult) => {
          // Update the database with the result
          const updateData = genResult.success
            ? {
                generatedImageUrl: genResult.imageUrl,
                generatedAt: new Date(),
                generationProvider: genResult.provider,
                generationError: null,
              }
            : {
                generationError: genResult.error,
                generatedAt: new Date(),
                generationProvider: genResult.provider,
              };

          await db
            .update(articleImageIntents)
            .set(updateData)
            .where(eq(articleImageIntents.id, intent.id));

          console.log(`[T2I] Image generation ${genResult.success ? "completed" : "failed"} for article ${articleId}`);
        }).catch((err) => {
          console.error(`[T2I] Image generation error for article ${articleId}:`, err);
        });

        imageResult = { generating: true, intentId: intent.id };
      } else if (intent?.generatedImageUrl) {
        imageResult = { imageUrl: intent.generatedImageUrl, cached: true };
      }
    }

    return NextResponse.json({ success: true, approved, image: imageResult });
  } catch (error) {
    console.error("Error updating article approval:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
