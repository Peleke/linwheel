import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { brandStyleProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/brand-styles/[id]/activate
 * Activate a brand style profile (deactivates others)
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
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

    // Deactivate all profiles for this user
    await db
      .update(brandStyleProfiles)
      .set({ isActive: false })
      .where(eq(brandStyleProfiles.userId, user.id));

    // Activate the requested profile
    const [profile] = await db
      .update(brandStyleProfiles)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(brandStyleProfiles.id, id))
      .returning();

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error activating brand style:", error);
    return NextResponse.json(
      { error: "Failed to activate brand style" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/brand-styles/[id]/activate
 * Deactivate a brand style profile
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

    // Deactivate the profile
    const [profile] = await db
      .update(brandStyleProfiles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(brandStyleProfiles.id, id))
      .returning();

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error deactivating brand style:", error);
    return NextResponse.json(
      { error: "Failed to deactivate brand style" },
      { status: 500 }
    );
  }
}
