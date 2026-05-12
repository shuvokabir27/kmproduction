
CREATE TABLE public.voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  sequence TEXT,
  audio_path TEXT NOT NULL,
  duration_seconds NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view voice notes"
  ON public.voice_notes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert voice notes"
  ON public.voice_notes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update voice notes"
  ON public.voice_notes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete voice notes"
  ON public.voice_notes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_voice_notes_updated_at
  BEFORE UPDATE ON public.voice_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
  VALUES ('voice-notes', 'voice-notes', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can read voice-notes objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'voice-notes' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload voice-notes objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-notes' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update voice-notes objects"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'voice-notes' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete voice-notes objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'voice-notes' AND public.has_role(auth.uid(), 'admin'));
