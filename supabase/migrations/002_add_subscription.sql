-- Subscription plan enum
CREATE TYPE public.subscription_plan AS ENUM ('free', 'premium');

-- Add plan column to users — all existing users default to 'free'
ALTER TABLE public.users
  ADD COLUMN plan public.subscription_plan NOT NULL DEFAULT 'free';

-- Add billing cadence for when payments are implemented
-- monthly | biannual | annual — NULL means free tier (no active subscription)
CREATE TYPE public.billing_cadence AS ENUM ('monthly', 'biannual', 'annual');

ALTER TABLE public.users
  ADD COLUMN billing_cadence public.billing_cadence,
  ADD COLUMN plan_started_at  TIMESTAMPTZ,
  ADD COLUMN plan_expires_at  TIMESTAMPTZ;

-- ── To manually grant premium access during development ──────────────────────
-- Run this in the Supabase SQL editor, replacing the email address:
--
--   UPDATE public.users
--   SET plan = 'premium', billing_cadence = 'monthly', plan_started_at = now()
--   WHERE email = 'your@email.com';
--
-- To revoke:
--   UPDATE public.users
--   SET plan = 'free', billing_cadence = NULL, plan_started_at = NULL, plan_expires_at = NULL
--   WHERE email = 'your@email.com';
-- ─────────────────────────────────────────────────────────────────────────────
