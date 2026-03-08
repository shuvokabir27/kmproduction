
-- Channels table
CREATE TABLE public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  platform text DEFAULT 'youtube',
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channels viewable by everyone" ON public.channels FOR SELECT USING (true);
CREATE POLICY "Admins can manage channels" ON public.channels FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Link shootings to channels when published
ALTER TABLE public.shootings ADD COLUMN channel_id uuid REFERENCES public.channels(id) DEFAULT NULL;
