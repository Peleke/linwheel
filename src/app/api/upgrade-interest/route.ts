/**
 * POST /api/upgrade-interest - Mark user as interested in Pro
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { markInterestedInPro } from "@/lib/usage";

export async function POST() {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await markInterestedInPro(user.id);

    console.log(`[UpgradeInterest] User ${user.email} expressed interest in Pro`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking interest:", error);
    return NextResponse.json(
      { error: "Failed to submit interest" },
      { status: 500 }
    );
  }
}
