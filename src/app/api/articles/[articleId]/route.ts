/**
 * GET/PATCH/DELETE /api/articles/[articleId] - Get, update, or delete an article
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articles, articleImageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ articleId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Require authenticated user
    try {
      await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { articleId } = await params;

    // Get the article
    const article = await db.query.articles.findFirst({
      where: eq(articles.id, articleId),
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Get image intent if exists
    const intent = await db.query.articleImageIntents.findFirst({
      where: eq(articleImageIntents.articleId, articleId),
    });

    // Helper to safely convert date to ISO string
    const safeToISOString = (date: Date | null | undefined): string | null => {
      if (!date) return null;
      try {
        const d = new Date(date);
        return isNaN(d.getTime()) ? null : d.toISOString();
      } catch {
        return null;
      }
    };

    return NextResponse.json({
      id: article.id,
      runId: article.runId,
      articleType: article.articleType,
      title: article.title,
      subtitle: article.subtitle,
      introduction: article.introduction,
      sections: article.sections,
      conclusion: article.conclusion,
      fullText: article.fullText,
      versionNumber: article.versionNumber,
      approved: article.approved,
      scheduledAt: safeToISOString(article.scheduledAt),
      imageIntent: intent
        ? {
            id: intent.id,
            headlineText: intent.headlineText,
            prompt: intent.prompt,
            generatedImageUrl: intent.generatedImageUrl,
          }
        : null,
    });
  } catch (error) {
    console.error("Get article error:", error);
    return NextResponse.json(
      { error: "Failed to get article" },
      { status: 500 }
    );
  }
}

interface UpdateArticleBody {
  title?: string;
  subtitle?: string;
  introduction?: string;
  sections?: string[];
  conclusion?: string;
  fullText?: string;
  autoPublish?: boolean;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Require authenticated user
    try {
      await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { articleId } = await params;
    const body = (await request.json()) as UpdateArticleBody;

    // Check article exists
    const article = await db.query.articles.findFirst({
      where: eq(articles.id, articleId),
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Build update object
    const updates: Partial<typeof articles.$inferInsert> = {};

    if (body.title !== undefined) {
      updates.title = body.title.trim();
    }

    if (body.subtitle !== undefined) {
      updates.subtitle = body.subtitle.trim();
    }

    if (body.introduction !== undefined) {
      updates.introduction = body.introduction.trim();
    }

    if (body.sections !== undefined) {
      updates.sections = body.sections;
    }

    if (body.conclusion !== undefined) {
      updates.conclusion = body.conclusion.trim();
    }

    if (body.fullText !== undefined) {
      updates.fullText = body.fullText.trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    await db
      .update(articles)
      .set(updates)
      .where(eq(articles.id, articleId));

    return NextResponse.json({
      success: true,
      message: "Article updated successfully",
    });
  } catch (error) {
    console.error("Update article error:", error);
    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Require authenticated user
    try {
      await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { articleId } = await params;

    // Check article exists
    const article = await db.query.articles.findFirst({
      where: eq(articles.id, articleId),
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Delete associated image intents first (if any)
    await db
      .delete(articleImageIntents)
      .where(eq(articleImageIntents.articleId, articleId));

    // Delete the article
    await db
      .delete(articles)
      .where(eq(articles.id, articleId));

    return NextResponse.json({
      success: true,
      message: "Article deleted successfully",
    });
  } catch (error) {
    console.error("Delete article error:", error);
    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 }
    );
  }
}
