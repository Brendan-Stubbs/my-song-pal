-- Migration 010: Melody Maker compositions

-- ── melodies ─────────────────────────────────────────────────────────────────
-- One row per saved melody. The full arrangement (notes, chords, timing) is
-- stored as JSONB in `data`, mirroring the metronome_loops pattern.

CREATE TABLE IF NOT EXISTS public.melodies (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name       text        NOT NULL DEFAULT 'Untitled melody',
  data       jsonb       NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS melodies_user_idx
  ON public.melodies (user_id, created_at);

ALTER TABLE public.melodies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own melodies"
  ON public.melodies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own melodies"
  ON public.melodies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own melodies"
  ON public.melodies FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own melodies"
  ON public.melodies FOR DELETE
  USING (auth.uid() = user_id);
