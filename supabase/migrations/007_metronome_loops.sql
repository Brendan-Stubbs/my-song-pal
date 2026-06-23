-- Metronome loop configurations saved by users.
-- `data` holds all loop fields except id/timestamps (stored as separate columns for
-- easy querying; the rest serialised as JSONB for flexibility).

CREATE TABLE IF NOT EXISTS public.metronome_loops (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  data        jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on every row update.
CREATE OR REPLACE TRIGGER metronome_loops_updated_at
  BEFORE UPDATE ON public.metronome_loops
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Enable RLS.
ALTER TABLE public.metronome_loops ENABLE ROW LEVEL SECURITY;

-- Users may only see their own loops.
CREATE POLICY "Users can read own metronome loops"
  ON public.metronome_loops FOR SELECT
  USING (auth.uid() = user_id);

-- Users may insert loops for themselves.
CREATE POLICY "Users can insert own metronome loops"
  ON public.metronome_loops FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users may update their own loops.
CREATE POLICY "Users can update own metronome loops"
  ON public.metronome_loops FOR UPDATE
  USING (auth.uid() = user_id);

-- Users may delete their own loops.
CREATE POLICY "Users can delete own metronome loops"
  ON public.metronome_loops FOR DELETE
  USING (auth.uid() = user_id);
