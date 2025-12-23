import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  generationRuns, insights, linkedinPosts, imageIntents,
  articles, articleImageIntents
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ runId: string }>;
}

/**
 * DELETE /api/runs/[runId] - Delete a single generation run and related data
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { runId } = await params;

    // Check run exists
    const run = await db.query.generationRuns.findFirst({
      where: eq(generationRuns.id, runId),
      columns: { id: true },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    // Get all post IDs for this run
    const posts = await db.query.linkedinPosts.findMany({
      where: eq(linkedinPosts.runId, runId),
      columns: { id: true },
    });
    const postIds = posts.map((p) => p.id);

    // Get all article IDs for this run
    const articleRecords = await db.query.articles.findMany({
      where: eq(articles.runId, runId),
      columns: { id: true },
    });
    const articleIds = articleRecords.map((a) => a.id);

    // Delete in order: image_intents -> content -> insights -> generation_runs
    if (postIds.length > 0) {
      await db.delete(imageIntents).where(inArray(imageIntents.postId, postIds));
      await db.delete(linkedinPosts).where(eq(linkedinPosts.runId, runId));
    }

    if (articleIds.length > 0) {
      await db.delete(articleImageIntents).where(inArray(articleImageIntents.articleId, articleIds));
      await db.delete(articles).where(eq(articles.runId, runId));
    }

    await db.delete(insights).where(eq(insights.runId, runId));
    await db.delete(generationRuns).where(eq(generationRuns.id, runId));

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Error deleting run:", error);
    return NextResponse.json(
      { error: "Failed to delete run" },
      { status: 500 }
    );
  }
}
