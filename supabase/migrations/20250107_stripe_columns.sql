-- Migration: Stripe Columns
-- Created: 2025-01-07
-- Description: Add Stripe subscription fields to profiles table

-- Add Stripe columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMPTZ;

-- Index for faster customer lookups (webhook handler)
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
ON public.profiles(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;
