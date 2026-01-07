/**
 * Stripe Configuration
 *
 * Defines subscription plans and pricing.
 * Price IDs come from Stripe Dashboard.
 */

export const PLANS = {
  free: {
    name: "Free",
    description: "Get started with LinWheel",
    features: [
      "10 free generations",
      "LinkedIn posts",
      "Articles",
      "Carousel generation",
    ],
    limits: {
      generationsPerMonth: 10,
    },
  },
  pro: {
    name: "Pro",
    description: "Unlimited content generation",
    features: [
      "Unlimited generations",
      "LinkedIn posts",
      "Articles",
      "Carousel generation",
      "Priority support",
    ],
    limits: {
      generationsPerMonth: Infinity,
    },
    // Price IDs from Stripe Dashboard
    priceId: {
      monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
      yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    },
    price: {
      monthly: 29,
      yearly: 290,
    },
  },
} as const;

export type PlanType = keyof typeof PLANS;

/**
 * Map Stripe subscription status to our internal status
 */
export function mapStripeStatus(
  stripeStatus: string
): "free" | "pro" | "past_due" | "canceled" {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "pro";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    default:
      return "free";
  }
}

/**
 * Get the app URL for redirects
 */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
