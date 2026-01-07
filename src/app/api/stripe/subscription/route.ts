/**
 * Stripe Subscription Status API
 *
 * Returns current user's subscription status.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUsage } from "@/lib/usage";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usage = await getUsage(user.id);

    return NextResponse.json({
      status: usage.subscriptionStatus,
      usage: {
        count: usage.count,
        limit: usage.limit,
        remaining: usage.remaining,
      },
      isPro: usage.subscriptionStatus === "pro",
    });
  } catch (error) {
    console.error("[Subscription API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
