/**
 * Stripe Portal API
 *
 * Creates a billing portal session for subscription management.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createPortalSession, isStripeConfigured } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    // Check Stripe configuration
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 503 }
      );
    }

    // Require authentication
    let user;
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get base URL from request origin (handles dynamic ports in dev)
    const origin = request.headers.get("origin") || request.headers.get("referer");
    const baseUrl = origin ? new URL(origin).origin : undefined;

    // Create portal session
    const portalUrl = await createPortalSession(user.id, baseUrl);

    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    console.error("[Stripe Portal] Error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
