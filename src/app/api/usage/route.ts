/**
 * GET /api/usage - Get usage info for current user
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getFullUsage } from "@/lib/usage";

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

    const usage = await getFullUsage(user.id);
    return NextResponse.json({
      email: user.email,
      id: user.id,
      // Content generations
      contentUsed: usage.content.count,
      contentLimit: usage.content.limit === Infinity ? "Unlimited" : usage.content.limit,
      contentRemaining: usage.content.remaining === Infinity ? "Unlimited" : usage.content.remaining,
      // Image generations
      imageUsed: usage.images.count,
      imageLimit: usage.images.limit === Infinity ? "Unlimited" : usage.images.limit,
      imageRemaining: usage.images.remaining === Infinity ? "Unlimited" : usage.images.remaining,
      // Legacy fields (for backwards compatibility)
      used: usage.content.count,
      limit: usage.content.limit === Infinity ? "Unlimited" : usage.content.limit,
      remaining: usage.content.remaining === Infinity ? "Unlimited" : usage.content.remaining,
      subscriptionStatus: usage.subscriptionStatus,
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage" },
      { status: 500 }
    );
  }
}
