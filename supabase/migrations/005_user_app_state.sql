-- Migration 005: user_app_state
--
-- Singleton row per user for dashboard layout/song builder and trainer stats.
-- Both are stored as JSONB so the schema can evolve without new migrations.

CREATE TABLE IF NOT EXISTS public.user_app_state (
  user_id        UUID        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  dashboard      JSONB,
  training_stats JSONB       NOT NULL DEFAULT '{}',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_app_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own app state"
  ON public.user_app_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own app state"
  ON public.user_app_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own app state"
  ON public.user_app_state FOR UPDATE
  USING (auth.uid() = user_id);

CREATE OR REPLACE TRIGGER user_app_state_updated_at
  BEFORE UPDATE ON public.user_app_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
