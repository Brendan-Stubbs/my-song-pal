-- Migration 009: practice history log + chord-book movable shapes

-- ── practice_log ─────────────────────────────────────────────────────────────
-- One row per completed (or partially completed) practice session. Powers the
-- streak / weekly-summary UI. Append-only: no updates.

CREATE TABLE IF NOT EXISTS public.practice_log (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id       uuid,
  session_name     text        NOT NULL DEFAULT 'Practice',
  practiced_on     date        NOT NULL DEFAULT current_date,
  minutes          integer     NOT NULL DEFAULT 0,
  blocks_completed integer     NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS practice_log_user_date_idx
  ON public.practice_log (user_id, practiced_on DESC);

ALTER TABLE public.practice_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own practice log"
  ON public.practice_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own practice log"
  ON public.practice_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own practice log"
  ON public.practice_log FOR DELETE
  USING (auth.uid() = user_id);

-- ── movable_shapes ───────────────────────────────────────────────────────────
-- User-defined movable/relative chord grips for the chord book. Shape geometry
-- (offsets, root string, optional barre) is stored as JSONB. Append-only.

CREATE TABLE IF NOT EXISTS public.movable_shapes (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name      text        NOT NULL DEFAULT 'Shape',
  shape     jsonb       NOT NULL DEFAULT '{}',
  added_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS movable_shapes_user_idx
  ON public.movable_shapes (user_id, added_at);

ALTER TABLE public.movable_shapes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own movable shapes"
  ON public.movable_shapes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own movable shapes"
  ON public.movable_shapes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own movable shapes"
  ON public.movable_shapes FOR DELETE
  USING (auth.uid() = user_id);
