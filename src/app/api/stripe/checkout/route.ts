/**
 * Stripe Checkout API
 *
 * Creates a checkout session for subscription upgrade.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createCheckoutSession, isStripeConfigured } from "@/lib/stripe";

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

    // Get billing cycle preference from request body
    const body = await request.json().catch(() => ({}));
    const billingCycle = body.billingCycle === "yearly" ? "yearly" : "monthly";
    const priceId = body.priceId;

    // Create checkout session
    const checkoutUrl = await createCheckoutSession(
      user.id,
      user.email!,
      priceId,
      billingCycle
    );

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error("[Stripe Checkout] Error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
