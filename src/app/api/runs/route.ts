import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  generationRuns, insights, linkedinPosts, imageIntents,
  articles, articleImageIntents, articleCarouselIntents
} from "@/db/schema";
import { inArray, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

/**
 * DELETE /api/runs - Clear all generation runs and related data for the current user
 */
export async function DELETE() {
  try {
    // Require authentication
    let user;
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all run IDs for this user
    const runs = await db.query.generationRuns.findMany({
      where: eq(generationRuns.userId, user.id),
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

    // Get all article IDs for these runs
    const articleRecords = await db.query.articles.findMany({
      where: inArray(articles.runId, runIds),
      columns: { id: true },
    });
    const articleIds = articleRecords.map((a) => a.id);

    // Delete in order: image_intents -> content -> insights -> generation_runs
    if (postIds.length > 0) {
      await db.delete(imageIntents).where(inArray(imageIntents.postId, postIds));
      await db.delete(linkedinPosts).where(inArray(linkedinPosts.runId, runIds));
    }

    if (articleIds.length > 0) {
      await db.delete(articleCarouselIntents).where(inArray(articleCarouselIntents.articleId, articleIds));
      await db.delete(articleImageIntents).where(inArray(articleImageIntents.articleId, articleIds));
      await db.delete(articles).where(inArray(articles.runId, runIds));
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
