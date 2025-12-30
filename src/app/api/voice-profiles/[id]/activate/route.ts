import { NextRequest, NextResponse } from "next/server";
import { setActiveProfile } from "@/lib/voice";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/voice-profiles/[id]/activate
 * Set this profile as the active voice profile
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await setActiveProfile(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error activating voice profile:", error);
    return NextResponse.json(
      { error: "Failed to activate voice profile" },
      { status: 500 }
    );
  }
}
