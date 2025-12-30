import { NextRequest, NextResponse } from "next/server";
import {
  updateVoiceProfile,
  deleteVoiceProfile,
  setActiveProfile,
} from "@/lib/voice";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/voice-profiles/[id]
 * Update a voice profile
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, samples, isActive } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (samples !== undefined) updates.samples = samples;
    if (isActive !== undefined) updates.isActive = isActive;

    const profile = await updateVoiceProfile(id, updates);

    if (!profile) {
      return NextResponse.json(
        { error: "Voice profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error updating voice profile:", error);
    return NextResponse.json(
      { error: "Failed to update voice profile" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/voice-profiles/[id]
 * Delete a voice profile
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteVoiceProfile(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting voice profile:", error);
    return NextResponse.json(
      { error: "Failed to delete voice profile" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/voice-profiles/[id]/activate
 * Set this profile as active
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const url = new URL(request.url);

    // Check if this is an activate action
    if (url.pathname.endsWith("/activate")) {
      await setActiveProfile(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error activating voice profile:", error);
    return NextResponse.json(
      { error: "Failed to activate voice profile" },
      { status: 500 }
    );
  }
}
