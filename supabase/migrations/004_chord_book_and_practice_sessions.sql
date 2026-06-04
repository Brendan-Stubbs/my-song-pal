-- Migration 004: chord_book and practice_sessions tables
--
-- Moves user data off localStorage so it persists across devices and sessions.
-- Both tables are owned by the user (RLS: users can only see their own rows).

-- ── Chord book ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chord_book (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  root       TEXT        NOT NULL,
  quality    TEXT        NOT NULL,
  symbol     TEXT        NOT NULL,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each user can only save a given root+quality once
  CONSTRAINT chord_book_unique_per_user UNIQUE (user_id, root, quality)
);

ALTER TABLE public.chord_book ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own chord book"
  ON public.chord_book FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into own chord book"
  ON public.chord_book FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from own chord book"
  ON public.chord_book FOR DELETE
  USING (auth.uid() = user_id);

-- ── Practice sessions ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL DEFAULT 'New Session',
  -- blocks is stored as a JSONB array of { id, name, durationMinutes, notes }
  blocks     JSONB       NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own practice sessions"
  ON public.practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own practice sessions"
  ON public.practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own practice sessions"
  ON public.practice_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own practice sessions"
  ON public.practice_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at on every write
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER practice_sessions_updated_at
  BEFORE UPDATE ON public.practice_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
