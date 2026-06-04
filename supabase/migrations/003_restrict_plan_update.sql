-- Migration 003: restrict users from self-updating subscription columns
--
-- The previous broad UPDATE policy allowed any authenticated user to write
-- ANY column on their own row — including plan, billing_cadence, etc.
-- This migration replaces it with a column-level restriction so users can
-- only update their own profile fields (display_name, avatar_url).
-- Subscription columns must only be written by service-role (i.e. your
-- payment webhook or an admin function).

-- Drop the old unrestricted policy
DROP POLICY IF EXISTS "Users can update own row" ON public.users;

-- Profile-only update: users may only write display_name and avatar_url
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Subscription columns must not change via this policy.
    -- Postgres column-level grants are the cleanest enforcement, but since
    -- Supabase uses a single postgrest role we rely on the WITH CHECK here
    -- to reject any row where these values differ from the stored values.
    AND plan             = (SELECT plan             FROM public.users WHERE id = auth.uid())
    AND billing_cadence  IS NOT DISTINCT FROM (SELECT billing_cadence  FROM public.users WHERE id = auth.uid())
    AND plan_started_at  IS NOT DISTINCT FROM (SELECT plan_started_at  FROM public.users WHERE id = auth.uid())
    AND plan_expires_at  IS NOT DISTINCT FROM (SELECT plan_expires_at  FROM public.users WHERE id = auth.uid())
  );

-- ── To update subscription state from your server (service role bypasses RLS) ─
-- Use the Supabase service-role client from your payment webhook:
--
--   supabase.from('users').update({
--     plan: 'premium',
--     billing_cadence: 'monthly',
--     plan_started_at: new Date().toISOString(),
--     plan_expires_at: addMonths(new Date(), 1).toISOString(),
--   }).eq('id', userId)
--
-- The service-role key bypasses RLS, so this will work even with the
-- restricted policy above.
-- ──────────────────────────────────────────────────────────────────────────────
