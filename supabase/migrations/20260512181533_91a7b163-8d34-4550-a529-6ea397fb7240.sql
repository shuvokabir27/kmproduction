
ALTER TABLE public.voice_notes
  ALTER COLUMN audio_path DROP NOT NULL;

CREATE TABLE public.voice_note_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_note_id UUID NOT NULL REFERENCES public.voice_notes(id) ON DELETE CASCADE,
  sequence_number INT NOT NULL,
  audio_path TEXT NOT NULL,
  duration_seconds NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (voice_note_id, sequence_number)
);

ALTER TABLE public.voice_note_clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view voice note clips"
  ON public.voice_note_clips FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert voice note clips"
  ON public.voice_note_clips FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update voice note clips"
  ON public.voice_note_clips FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete voice note clips"
  ON public.voice_note_clips FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_voice_note_clips_updated_at
  BEFORE UPDATE ON public.voice_note_clips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
