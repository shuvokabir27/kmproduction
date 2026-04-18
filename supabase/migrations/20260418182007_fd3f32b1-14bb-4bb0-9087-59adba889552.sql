CREATE POLICY "Members can view own client artist entries"
ON public.client_project_artists
FOR SELECT
TO authenticated
USING (
  artist_name IN (
    SELECT p.full_name FROM public.profiles p WHERE p.user_id = auth.uid()
    UNION
    SELECT p.full_name_en FROM public.profiles p WHERE p.user_id = auth.uid() AND p.full_name_en IS NOT NULL
  )
);