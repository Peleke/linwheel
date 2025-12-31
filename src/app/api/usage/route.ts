/**
 * GET /api/usage - Get usage info for current user
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getUsage } from "@/lib/usage";

export async function GET() {
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

    const usage = await getUsage(user.id);
    return NextResponse.json(usage);
  } catch (error) {
    console.error("Error fetching usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage" },
      { status: 500 }
    );
  }
}
