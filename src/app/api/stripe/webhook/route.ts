/**
 * Stripe Webhook Handler
 *
 * Handles subscription lifecycle events and syncs status to Supabase.
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, syncSubscriptionStatus, mapStripeStatus } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

// Disable body parsing - we need raw body for signature verification
export const runtime = "nodejs";

/**
 * Verify webhook signature and parse event
 */
async function verifyWebhook(request: NextRequest): Promise<Stripe.Event> {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    throw new Error("Missing stripe-signature header");
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  }

  const body = await request.text();

  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}

/**
 * Handle subscription events
 */
async function handleSubscriptionEvent(
  event: Stripe.Event,
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = await createAdminClient();
  const customerId = subscription.customer as string;

  // Get user by Stripe customer ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    // Try to find user by metadata
    const userId = subscription.metadata?.supabaseUserId;
    if (userId) {
      // Link customer to user
      await supabase
        .from("profiles")
        .upsert({
          id: userId,
          stripe_customer_id: customerId,
        });
      console.log(`[Webhook] Linked customer ${customerId} to user ${userId}`);
    } else {
      console.warn(`[Webhook] No user found for customer ${customerId}`);
      return;
    }
  }

  const userId = profile?.id || subscription.metadata?.supabaseUserId;
  if (!userId) return;

  const status = mapStripeStatus(subscription.status);

  // Get current period end from subscription items (API v2025+)
  // The items array contains subscription items with period info
  const firstItem = subscription.items?.data?.[0];
  const periodEnd = firstItem?.current_period_end;

  // Update user profile
  await supabase
    .from("profiles")
    .update({
      subscription_status: status === "pro" ? "pro" : "free",
      stripe_subscription_id: subscription.id,
      stripe_current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    })
    .eq("id", userId);

  console.log(
    `[Webhook] ${event.type}: Updated user ${userId} to ${status}`
  );
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const supabase = await createAdminClient();
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const userId = session.metadata?.supabaseUserId;

  if (!userId) {
    console.warn("[Webhook] checkout.session.completed: No supabaseUserId in metadata");
    return;
  }

  // Link customer to user and update subscription info
  await supabase
    .from("profiles")
    .upsert({
      id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: "pro",
    });

  // Sync full subscription details
  await syncSubscriptionStatus(customerId);

  console.log(`[Webhook] Checkout completed for user ${userId}`);
}

/**
 * Handle customer subscription deleted
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = await createAdminClient();
  const customerId = subscription.customer as string;

  // Get user by Stripe customer ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.warn(`[Webhook] No user found for deleted subscription ${subscription.id}`);
    return;
  }

  // Downgrade to free
  await supabase
    .from("profiles")
    .update({
      subscription_status: "free",
      stripe_subscription_id: null,
      stripe_current_period_end: null,
    })
    .eq("id", profile.id);

  console.log(`[Webhook] Subscription deleted for user ${profile.id}`);
}

export async function POST(request: NextRequest) {
  try {
    const event = await verifyWebhook(request);

    console.log(`[Webhook] Processing ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") {
          await handleCheckoutCompleted(session);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionEvent(event, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        // In Stripe API v2025+, subscription is nested in parent.subscription_details
        const subscriptionId = invoice.parent?.subscription_details?.subscription;
        if (subscriptionId && invoice.customer) {
          await syncSubscriptionStatus(invoice.customer as string);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Mark as past_due but don't revoke access immediately
        const supabase = await createAdminClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          // Could send notification email here
          console.log(`[Webhook] Payment failed for user ${profile.id}`);
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error:", error);

    // Return 400 for signature verification errors
    if (error instanceof Error && error.message.includes("signature")) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
