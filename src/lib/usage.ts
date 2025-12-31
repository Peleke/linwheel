/**
 * Usage Tracking
 *
 * Tracks generation count per user and enforces limits.
 * Uses Supabase profiles table for storage.
 *
 * Two types of usage:
 * - Content generations (transcript → posts/articles): 10 free
 * - Image generations (T2I for posts/carousels): 20 free
 */

import { createAdminClient } from "@/lib/supabase/server";

export const FREE_CONTENT_LIMIT = 25;
export const FREE_IMAGE_LIMIT = 25;

// Keep old export for backwards compatibility
export const FREE_LIMIT = FREE_CONTENT_LIMIT;

export interface UsageInfo {
  count: number;
  limit: number;
  remaining: number;
  subscriptionStatus: "free" | "pro";
}

export interface FullUsageInfo {
  content: UsageInfo;
  images: UsageInfo;
  subscriptionStatus: "free" | "pro";
}

/**
 * Get usage info for a user (content generations only - for backwards compatibility)
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
      limit: FREE_CONTENT_LIMIT,
      remaining: FREE_CONTENT_LIMIT,
      subscriptionStatus: "free",
    };
  }

  const isPro = data.subscription_status === "pro";
  const limit = isPro ? Infinity : FREE_CONTENT_LIMIT;
  const count = data.generation_count || 0;

  return {
    count,
    limit,
    remaining: Math.max(0, limit - count),
    subscriptionStatus: isPro ? "pro" : "free",
  };
}

/**
 * Get full usage info including both content and image generations
 */
export async function getFullUsage(userId: string): Promise<FullUsageInfo> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("generation_count, image_generation_count, subscription_status")
    .eq("id", userId)
    .single();

  const isPro = !error && data?.subscription_status === "pro";

  const contentCount = data?.generation_count || 0;
  const imageCount = data?.image_generation_count || 0;

  const contentLimit = isPro ? Infinity : FREE_CONTENT_LIMIT;
  const imageLimit = isPro ? Infinity : FREE_IMAGE_LIMIT;

  return {
    content: {
      count: contentCount,
      limit: contentLimit,
      remaining: Math.max(0, contentLimit - contentCount),
      subscriptionStatus: isPro ? "pro" : "free",
    },
    images: {
      count: imageCount,
      limit: imageLimit,
      remaining: Math.max(0, imageLimit - imageCount),
      subscriptionStatus: isPro ? "pro" : "free",
    },
    subscriptionStatus: isPro ? "pro" : "free",
  };
}

/**
 * Check if user can generate content
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
 * Check if user can generate images
 */
export async function canGenerateImages(userId: string): Promise<{
  allowed: boolean;
  usage: UsageInfo;
}> {
  const fullUsage = await getFullUsage(userId);
  const allowed = fullUsage.images.remaining > 0 || fullUsage.subscriptionStatus === "pro";

  return { allowed, usage: fullUsage.images };
}

/**
 * Increment content generation count
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
 * Increment image generation count
 */
export async function incrementImageUsage(userId: string, count: number = 1): Promise<void> {
  const supabase = await createAdminClient();

  // Try RPC first (if exists)
  const { error: rpcError } = await supabase.rpc("increment_image_generation_count", {
    user_id: userId,
    increment_by: count,
  });

  if (rpcError) {
    // Fallback: manual increment
    const { data: profile } = await supabase
      .from("profiles")
      .select("image_generation_count")
      .eq("id", userId)
      .single();

    const currentCount = profile?.image_generation_count || 0;

    await supabase
      .from("profiles")
      .upsert({
        id: userId,
        image_generation_count: currentCount + count,
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
