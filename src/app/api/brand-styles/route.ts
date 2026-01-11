import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { brandStyleProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getUserBrandStyles, validateBrandStyle, BRAND_STYLE_PRESETS } from "@/lib/brand-styles";

/**
 * GET /api/brand-styles
 * List all brand style profiles for the current user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const profiles = await getUserBrandStyles(user.id);

    // Find active profile
    const activeProfile = profiles.find((p) => p.isActive);

    return NextResponse.json({
      profiles,
      activeProfileId: activeProfile?.id ?? null,
      presets: BRAND_STYLE_PRESETS,
    });
  } catch (error) {
    console.error("Error fetching brand styles:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand styles" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/brand-styles
 * Create a new brand style profile
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
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

    // If this profile should be active, deactivate others first
    if (body.isActive) {
      await db
        .update(brandStyleProfiles)
        .set({ isActive: false })
        .where(eq(brandStyleProfiles.userId, user.id));
    }

    // Create the profile
    const [profile] = await db
      .insert(brandStyleProfiles)
      .values({
        id: randomUUID(),
        userId: user.id,
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
        isActive: body.isActive ?? false,
      })
      .returning();

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error creating brand style:", error);
    return NextResponse.json(
      { error: "Failed to create brand style" },
      { status: 500 }
    );
  }
}
