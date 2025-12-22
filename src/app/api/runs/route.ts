import { NextResponse } from "next/server";
import { db } from "@/db";
import { generationRuns, insights, linkedinPosts, imageIntents } from "@/db/schema";
import { inArray } from "drizzle-orm";

/**
 * DELETE /api/runs - Clear all generation runs and related data
 */
export async function DELETE() {
  try {
    // Get all run IDs first
    const runs = await db.query.generationRuns.findMany({
      columns: { id: true },
    });

    if (runs.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    const runIds = runs.map((r) => r.id);

    // Get all post IDs for these runs
    const posts = await db.query.linkedinPosts.findMany({
      where: inArray(linkedinPosts.runId, runIds),
      columns: { id: true },
    });
    const postIds = posts.map((p) => p.id);

    // Delete in order: image_intents -> linkedin_posts -> insights -> generation_runs
    if (postIds.length > 0) {
      await db.delete(imageIntents).where(inArray(imageIntents.postId, postIds));
      await db.delete(linkedinPosts).where(inArray(linkedinPosts.runId, runIds));
    }

    await db.delete(insights).where(inArray(insights.runId, runIds));
    await db.delete(generationRuns).where(inArray(generationRuns.id, runIds));

    return NextResponse.json({ deleted: runIds.length });
  } catch (error) {
    console.error("Error clearing runs:", error);
    return NextResponse.json(
      { error: "Failed to clear runs" },
      { status: 500 }
    );
  }
}
