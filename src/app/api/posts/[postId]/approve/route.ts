import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { linkedinPosts, imageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateImage } from "@/lib/t2i";
import type { StylePreset } from "@/lib/t2i";

interface Props {
  params: Promise<{ postId: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { postId } = await params;
    const body = await request.json();
    const { approved } = body;

    if (typeof approved !== "boolean") {
      return NextResponse.json(
        { error: "approved must be a boolean" },
        { status: 400 }
      );
    }

    // Update post approval status
    const result = await db
      .update(linkedinPosts)
      .set({ approved })
      .where(eq(linkedinPosts.id, postId))
      .returning({ id: linkedinPosts.id });

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // If approving, trigger image generation
    let imageResult = null;
    if (approved) {
      const intent = await db.query.imageIntents.findFirst({
        where: eq(imageIntents.postId, postId),
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
            .update(imageIntents)
            .set(updateData)
            .where(eq(imageIntents.id, intent.id));

          console.log(`[T2I] Image generation ${genResult.success ? "completed" : "failed"} for post ${postId}`);
        }).catch((err) => {
          console.error(`[T2I] Image generation error for post ${postId}:`, err);
        });

        imageResult = { generating: true, intentId: intent.id };
      } else if (intent?.generatedImageUrl) {
        imageResult = { imageUrl: intent.generatedImageUrl, cached: true };
      }
    }

    return NextResponse.json({ success: true, approved, image: imageResult });
  } catch (error) {
    console.error("Error updating approval:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
