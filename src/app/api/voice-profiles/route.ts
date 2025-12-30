import { NextRequest, NextResponse } from "next/server";
import {
  getAllVoiceProfiles,
  createVoiceProfile,
  getActiveVoiceProfile,
} from "@/lib/voice";

/**
 * GET /api/voice-profiles
 * List all voice profiles
 */
export async function GET() {
  try {
    const profiles = await getAllVoiceProfiles();
    const activeProfile = await getActiveVoiceProfile();

    return NextResponse.json({
      profiles,
      activeProfileId: activeProfile?.id ?? null,
    });
  } catch (error) {
    console.error("Error fetching voice profiles:", error);
    return NextResponse.json(
      { error: "Failed to fetch voice profiles" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/voice-profiles
 * Create a new voice profile
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, samples, isActive } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!samples || !Array.isArray(samples) || samples.length === 0) {
      return NextResponse.json(
        { error: "At least one writing sample is required" },
        { status: 400 }
      );
    }

    const profile = await createVoiceProfile({
      name,
      description: description || null,
      samples,
      isActive: isActive ?? false,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error creating voice profile:", error);
    return NextResponse.json(
      { error: "Failed to create voice profile" },
      { status: 500 }
    );
  }
}
