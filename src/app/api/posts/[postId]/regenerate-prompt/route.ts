import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { linkedinPosts, imageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateImageIntent, regenerateImageIntent } from "@/lib/generate";
import { randomUUID } from "crypto";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

/**
 * POST /api/posts/[postId]/regenerate-prompt
 *
 * Regenerates the image intent prompt for a post using the LLM.
 * Optionally accepts feedback to guide the regeneration.
 *
 * Body: { feedback?: string }
 * - If feedback is provided and an intent exists, regenerates WITH feedback
 * - If no feedback, generates fresh from post content
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { postId } = await params;

    // Parse optional feedback from request body
    let feedback: string | undefined;
    try {
      const body = await request.json();
      feedback = body.feedback;
    } catch {
      // No body or invalid JSON, that's fine
    }

    // Fetch the post
    const post = await db.query.linkedinPosts.findFirst({
      where: eq(linkedinPosts.id, postId),
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Parse body_beats if it's a string
    const bodyBeats = typeof post.bodyBeats === "string"
      ? JSON.parse(post.bodyBeats)
      : post.bodyBeats || [];

    // Check if post already has an image intent
    const existingIntent = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.postId, postId),
    });

    // Generate or regenerate image intent
    let newIntent;
    if (feedback && existingIntent) {
      // Regenerate with feedback using existing intent as base
      console.log(`[API] Regenerating prompt for post ${postId} with feedback: "${feedback}"`);
      newIntent = await regenerateImageIntent(
        {
          hook: post.hook,
          body_beats: bodyBeats,
          full_text: post.fullText,
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
      console.log(`[API] Generating fresh prompt for post ${postId}`);
      newIntent = await generateImageIntent({
        hook: post.hook,
        body_beats: bodyBeats,
        full_text: post.fullText,
      });
    }

    if (existingIntent) {
      // Update existing intent
      await db
        .update(imageIntents)
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
        .where(eq(imageIntents.id, existingIntent.id));

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
        .insert(imageIntents)
        .values({
          id: randomUUID(),
          postId,
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
