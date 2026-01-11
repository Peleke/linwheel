import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { brandStyleProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { validateBrandStyle } from "@/lib/brand-styles";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/brand-styles/[id]
 * Get a specific brand style profile
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const profile = await db.query.brandStyleProfiles.findFirst({
      where: and(
        eq(brandStyleProfiles.id, id),
        eq(brandStyleProfiles.userId, user.id)
      ),
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Brand style not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error fetching brand style:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand style" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/brand-styles/[id]
 * Update a brand style profile
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check ownership
    const existing = await db.query.brandStyleProfiles.findFirst({
      where: and(
        eq(brandStyleProfiles.id, id),
        eq(brandStyleProfiles.userId, user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Brand style not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = validateBrandStyle(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    // Update the profile
    const [profile] = await db
      .update(brandStyleProfiles)
      .set({
        name: body.name,
        description: body.description || null,
        primaryColors: body.primaryColors,
        secondaryColors: body.secondaryColors || null,
        colorMood: body.colorMood || null,
        typographyStyle: body.typographyStyle || null,
        headlineWeight: body.headlineWeight || null,
        imageryApproach: body.imageryApproach,
        artisticReferences: body.artisticReferences || null,
        lightingPreference: body.lightingPreference || null,
        compositionStyle: body.compositionStyle || null,
        moodDescriptors: body.moodDescriptors || null,
        texturePreference: body.texturePreference || null,
        aspectRatioPreference: body.aspectRatioPreference || null,
        depthOfField: body.depthOfField || null,
        stylePrefix: body.stylePrefix || null,
        styleSuffix: body.styleSuffix || null,
        negativeConcepts: body.negativeConcepts || null,
        referenceImageUrls: body.referenceImageUrls || null,
        updatedAt: new Date(),
      })
      .where(eq(brandStyleProfiles.id, id))
      .returning();

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error updating brand style:", error);
    return NextResponse.json(
      { error: "Failed to update brand style" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/brand-styles/[id]
 * Delete a brand style profile
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check ownership and active status
    const existing = await db.query.brandStyleProfiles.findFirst({
      where: and(
        eq(brandStyleProfiles.id, id),
        eq(brandStyleProfiles.userId, user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Brand style not found" },
        { status: 404 }
      );
    }

    if (existing.isActive) {
      return NextResponse.json(
        { error: "Cannot delete active brand style. Deactivate it first or activate another." },
        { status: 400 }
      );
    }

    await db
      .delete(brandStyleProfiles)
      .where(eq(brandStyleProfiles.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting brand style:", error);
    return NextResponse.json(
      { error: "Failed to delete brand style" },
      { status: 500 }
    );
  }
}
