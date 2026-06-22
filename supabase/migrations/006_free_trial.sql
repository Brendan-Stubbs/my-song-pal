-- Migration 006: free trial period
--
-- Every new user gets a 30-day full-access trial starting at sign-up — no
-- payment details required. While the trial is active the user is treated as
-- premium; once it lapses they fall back to the free tier and paid features
-- become locked.

-- ── Trial column ────────────────────────────────────────────────────────────

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Backfill existing users: their trial runs 30 days from when they signed up.
-- (Long-standing accounts may therefore already be past their trial, which is
-- the intended behaviour.)
UPDATE public.users
  SET trial_ends_at = created_at + INTERVAL '30 days'
  WHERE trial_ends_at IS NULL;

-- ── New sign-ups start a 30-day trial ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    now() + INTERVAL '30 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Lock trial_ends_at against client-side edits ────────────────────────────
--
-- Recreate the profile update policy so users still can't grant themselves a
-- longer trial (or change any subscription column). Only the service role may
-- write trial_ends_at.

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND plan             = (SELECT plan             FROM public.users WHERE id = auth.uid())
    AND billing_cadence  IS NOT DISTINCT FROM (SELECT billing_cadence  FROM public.users WHERE id = auth.uid())
    AND plan_started_at  IS NOT DISTINCT FROM (SELECT plan_started_at  FROM public.users WHERE id = auth.uid())
    AND plan_expires_at  IS NOT DISTINCT FROM (SELECT plan_expires_at  FROM public.users WHERE id = auth.uid())
    AND trial_ends_at    IS NOT DISTINCT FROM (SELECT trial_ends_at    FROM public.users WHERE id = auth.uid())
  );
