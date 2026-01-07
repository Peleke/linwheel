/**
 * Stripe Portal API
 *
 * Creates a billing portal session for subscription management.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createPortalSession, isStripeConfigured } from "@/lib/stripe";

export async function POST() {
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

    // Create portal session
    const portalUrl = await createPortalSession(user.id);

    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    console.error("[Stripe Portal] Error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
