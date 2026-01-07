/**
 * Stripe Client
 *
 * Server-side Stripe SDK wrapper with helpers.
 */

import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { PLANS, getAppUrl, mapStripeStatus } from "./config";

// Lazy-init singleton
let stripeClient: Stripe | null = null;

/**
 * Get Stripe client instance
 */
export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }
    stripeClient = new Stripe(key, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    });
  }
  return stripeClient;
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID
  );
}

/**
 * Get or create Stripe customer for user
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string
): Promise<string> {
  const supabase = await createAdminClient();
  const stripe = getStripe();

  // Check if user already has a Stripe customer
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      supabaseUserId: userId,
    },
  });

  // Save to profile
  await supabase
    .from("profiles")
    .upsert({
      id: userId,
      stripe_customer_id: customer.id,
    });

  console.log(`[Stripe] Created customer ${customer.id} for user ${userId}`);
  return customer.id;
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
  userId: string,
  email: string,
  priceId?: string,
  billingCycle: "monthly" | "yearly" = "monthly",
  baseUrl?: string
): Promise<string> {
  const stripe = getStripe();
  const customerId = await getOrCreateCustomer(userId, email);
  const appUrl = baseUrl || getAppUrl();

  // Use provided price ID or default based on billing cycle
  const finalPriceId =
    priceId ||
    (billingCycle === "yearly"
      ? PLANS.pro.priceId.yearly
      : PLANS.pro.priceId.monthly);

  if (!finalPriceId) {
    throw new Error(`Price ID not configured for ${billingCycle} billing`);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: finalPriceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/checkout/canceled`,
    subscription_data: {
      metadata: {
        supabaseUserId: userId,
      },
      // Optional: Add trial period
      // trial_period_days: 7,
    },
    metadata: {
      supabaseUserId: userId,
    },
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session URL");
  }

  console.log(`[Stripe] Created checkout session for user ${userId}`);
  return session.url;
}

/**
 * Create a billing portal session for subscription management
 */
export async function createPortalSession(userId: string, baseUrl?: string): Promise<string> {
  const stripe = getStripe();
  const supabase = await createAdminClient();
  const appUrl = baseUrl || getAppUrl();

  // Get customer ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (!profile?.stripe_customer_id) {
    throw new Error("No Stripe customer found for user");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}/settings`,
  });

  return session.url;
}

/**
 * Sync subscription status from Stripe to Supabase
 */
export async function syncSubscriptionStatus(
  customerId: string
): Promise<void> {
  const stripe = getStripe();
  const supabase = await createAdminClient();

  // Get subscriptions for customer
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 1,
  });

  const subscription = subscriptions.data[0];

  // Find user by customer ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.warn(`[Stripe] No profile found for customer ${customerId}`);
    return;
  }

  const status = subscription ? mapStripeStatus(subscription.status) : "free";

  // Get current period end from subscription items (API v2025+)
  const periodEnd = subscription?.items?.data?.[0]?.current_period_end;

  await supabase
    .from("profiles")
    .update({
      subscription_status: status === "pro" ? "pro" : "free",
      stripe_subscription_id: subscription?.id || null,
      stripe_current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    })
    .eq("id", profile.id);

  console.log(`[Stripe] Synced status for user ${profile.id}: ${status}`);
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const stripe = getStripe();

  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  console.log(`[Stripe] Scheduled cancellation for subscription ${subscriptionId}`);
}

/**
 * Get subscription details
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  const stripe = getStripe();

  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch {
    return null;
  }
}
