/**
 * Usage Tracking
 *
 * Tracks generation count per user and enforces limits.
 * Uses Supabase profiles table for storage.
 */

import { createAdminClient } from "@/lib/supabase/server";

export const FREE_LIMIT = 10;

export interface UsageInfo {
  count: number;
  limit: number;
  remaining: number;
  subscriptionStatus: "free" | "pro";
}

/**
 * Get usage info for a user
 */
export async function getUsage(userId: string): Promise<UsageInfo> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("generation_count, subscription_status")
    .eq("id", userId)
    .single();

  if (error || !data) {
    // Profile doesn't exist yet - return default values
    return {
      count: 0,
      limit: FREE_LIMIT,
      remaining: FREE_LIMIT,
      subscriptionStatus: "free",
    };
  }

  const isPro = data.subscription_status === "pro";
  const limit = isPro ? Infinity : FREE_LIMIT;
  const count = data.generation_count || 0;

  return {
    count,
    limit,
    remaining: Math.max(0, limit - count),
    subscriptionStatus: isPro ? "pro" : "free",
  };
}

/**
 * Check if user can generate
 */
export async function canGenerate(userId: string): Promise<{
  allowed: boolean;
  usage: UsageInfo;
}> {
  const usage = await getUsage(userId);
  const allowed = usage.remaining > 0 || usage.subscriptionStatus === "pro";

  return { allowed, usage };
}

/**
 * Increment usage count
 */
export async function incrementUsage(userId: string): Promise<void> {
  const supabase = await createAdminClient();

  // First try to increment existing profile
  const { error: updateError } = await supabase.rpc("increment_generation_count", {
    user_id: userId,
  });

  if (updateError) {
    // Fallback: manual increment
    const { data: profile } = await supabase
      .from("profiles")
      .select("generation_count")
      .eq("id", userId)
      .single();

    const currentCount = profile?.generation_count || 0;

    await supabase
      .from("profiles")
      .upsert({
        id: userId,
        generation_count: currentCount + 1,
      });
  }
}

/**
 * Mark user as interested in pro
 */
export async function markInterestedInPro(userId: string): Promise<void> {
  const supabase = await createAdminClient();

  await supabase
    .from("profiles")
    .update({
      interested_in_pro: true,
      interested_at: new Date().toISOString(),
    })
    .eq("id", userId);
}
