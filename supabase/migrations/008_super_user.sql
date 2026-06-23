-- Add super-user flag to the users table.
-- Super users can see experimental / in-development features.
--
-- To promote a user to super user, run in the Supabase SQL editor:
--   UPDATE public.users SET is_superuser = true WHERE email = 'you@example.com';
-- To demote:
--   UPDATE public.users SET is_superuser = false WHERE email = 'you@example.com';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_superuser BOOLEAN NOT NULL DEFAULT false;

-- Super users can read their own flag (already covered by the existing SELECT policy).
-- No additional RLS changes needed — existing "Users can read own row" covers this.
