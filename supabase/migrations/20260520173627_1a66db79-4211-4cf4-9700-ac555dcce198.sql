CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feature flags"
ON public.feature_flags FOR SELECT
USING (true);

CREATE POLICY "Admins can insert feature flags"
ON public.feature_flags FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update feature flags"
ON public.feature_flags FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete feature flags"
ON public.feature_flags FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.feature_flags (key, enabled) VALUES
  ('meme_generator', true),
  ('spotlight', true),
  ('members_list', true)
ON CONFLICT (key) DO NOTHING;