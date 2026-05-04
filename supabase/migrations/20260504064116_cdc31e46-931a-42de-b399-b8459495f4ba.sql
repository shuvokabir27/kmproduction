
CREATE TABLE public.memes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  photo_url TEXT,
  caption TEXT NOT NULL,
  caption_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(caption_hash)
);

CREATE INDEX idx_memes_member ON public.memes(member_id);
CREATE INDEX idx_memes_created ON public.memes(created_at DESC);

ALTER TABLE public.memes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Memes viewable by everyone"
ON public.memes FOR SELECT
USING (true);

CREATE POLICY "Authenticated can insert memes"
ON public.memes FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can delete memes"
ON public.memes FOR DELETE
USING (has_role(auth.uid(), 'admin'));
