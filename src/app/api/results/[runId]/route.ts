import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { generationRuns, linkedinPosts, imageIntents, articles, articleImageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;

    // Fetch run
    const run = await db.query.generationRuns.findFirst({
      where: eq(generationRuns.id, runId),
    });

    if (!run) {
      return NextResponse.json(
        { error: "Run not found" },
        { status: 404 }
      );
    }

    // Fetch posts
    const posts = await db.query.linkedinPosts.findMany({
      where: eq(linkedinPosts.runId, runId),
    });

    // Fetch image intents for each post
    const postsWithIntents = await Promise.all(
      posts.map(async (post) => {
        const intent = await db.query.imageIntents.findFirst({
          where: eq(imageIntents.postId, post.id),
        });
        return { ...post, imageIntent: intent };
      })
    );

    // Fetch articles
    const articleRecords = await db.query.articles.findMany({
      where: eq(articles.runId, runId),
    });

    // Fetch article image intents
    const articlesWithIntents = await Promise.all(
      articleRecords.map(async (article) => {
        const intent = await db.query.articleImageIntents.findFirst({
          where: eq(articleImageIntents.articleId, article.id),
        });
        return { ...article, imageIntent: intent };
      })
    );

    return NextResponse.json({
      run,
      posts: postsWithIntents,
      articles: articlesWithIntents,
    });
  } catch (error) {
    console.error("Results error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
