import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { imageIntents, postImageVersions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ intentId: string }>;
}

/**
 * GET /api/posts/image-intents/[intentId]/versions
 *
 * Returns all versions for a post image intent
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { intentId } = await params;

    // Check intent exists
    const intent = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.id, intentId),
    });

    if (!intent) {
      return NextResponse.json(
        { error: "Image intent not found" },
        { status: 404 }
      );
    }

    // Fetch all versions
    const versions = await db.query.postImageVersions.findMany({
      where: eq(postImageVersions.imageIntentId, intentId),
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
    console.error("Error fetching versions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/posts/image-intents/[intentId]/versions
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
    const intent = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.id, intentId),
    });

    if (!intent) {
      return NextResponse.json(
        { error: "Image intent not found" },
        { status: 404 }
      );
    }

    // Check version exists and belongs to this intent
    const version = await db.query.postImageVersions.findFirst({
      where: and(
        eq(postImageVersions.id, versionId),
        eq(postImageVersions.imageIntentId, intentId)
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
      .update(postImageVersions)
      .set({ isActive: false })
      .where(eq(postImageVersions.imageIntentId, intentId));

    // Activate the selected version
    await db
      .update(postImageVersions)
      .set({ isActive: true })
      .where(eq(postImageVersions.id, versionId));

    // Update the main image intent with this version's image
    await db
      .update(imageIntents)
      .set({
        generatedImageUrl: version.imageUrl,
        generatedAt: version.generatedAt,
        generationProvider: version.generationProvider,
      })
      .where(eq(imageIntents.id, intentId));

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
