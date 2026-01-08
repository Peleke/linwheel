import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articleImageIntents, articleCoverVersions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ intentId: string }>;
}

/**
 * GET /api/articles/image-intents/[intentId]/versions
 *
 * Returns all versions for an article cover image intent
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { intentId } = await params;

    // Check intent exists
    const intent = await db.query.articleImageIntents.findFirst({
      where: eq(articleImageIntents.id, intentId),
    });

    if (!intent) {
      return NextResponse.json(
        { error: "Image intent not found" },
        { status: 404 }
      );
    }

    // Fetch all versions
    const versions = await db.query.articleCoverVersions.findMany({
      where: eq(articleCoverVersions.articleImageIntentId, intentId),
      orderBy: (v, { desc }) => [desc(v.versionNumber)],
    });

    return NextResponse.json({
      intentId,
      versionCount: versions.length,
      versions: versions.map(v => ({
        id: v.id,
        versionNumber: v.versionNumber,
        imageUrl: v.imageUrl,
        isActive: v.isActive,
        includeText: v.includeText,
        textPosition: v.textPosition,
        headlineText: v.headlineText,
        generatedAt: v.generatedAt,
        generationProvider: v.generationProvider,
      })),
    });
  } catch (error) {
    console.error("Error fetching article cover versions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/articles/image-intents/[intentId]/versions
 *
 * Sets a specific version as active
 * Body: { versionId: string }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { intentId } = await params;
    const body = await request.json();
    const { versionId } = body as { versionId: string };

    if (!versionId) {
      return NextResponse.json(
        { error: "versionId is required" },
        { status: 400 }
      );
    }

    // Check intent exists
    const intent = await db.query.articleImageIntents.findFirst({
      where: eq(articleImageIntents.id, intentId),
    });

    if (!intent) {
      return NextResponse.json(
        { error: "Image intent not found" },
        { status: 404 }
      );
    }

    // Check version exists and belongs to this intent
    const version = await db.query.articleCoverVersions.findFirst({
      where: and(
        eq(articleCoverVersions.id, versionId),
        eq(articleCoverVersions.articleImageIntentId, intentId)
      ),
    });

    if (!version) {
      return NextResponse.json(
        { error: "Version not found for this intent" },
        { status: 404 }
      );
    }

    // Deactivate all versions for this intent
    await db
      .update(articleCoverVersions)
      .set({ isActive: false })
      .where(eq(articleCoverVersions.articleImageIntentId, intentId));

    // Activate the selected version
    await db
      .update(articleCoverVersions)
      .set({ isActive: true })
      .where(eq(articleCoverVersions.id, versionId));

    // Update the main image intent with this version's image
    await db
      .update(articleImageIntents)
      .set({
        generatedImageUrl: version.imageUrl,
        generatedAt: version.generatedAt,
        generationProvider: version.generationProvider,
      })
      .where(eq(articleImageIntents.id, intentId));

    return NextResponse.json({
      success: true,
      activeVersion: {
        id: version.id,
        versionNumber: version.versionNumber,
        imageUrl: version.imageUrl,
        includeText: version.includeText,
        textPosition: version.textPosition,
      },
    });
  } catch (error) {
    console.error("Error setting active version:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
