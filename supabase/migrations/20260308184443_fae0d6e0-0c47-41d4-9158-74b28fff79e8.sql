
-- Allow public (anon) users to read shootings where show_on_public = true
CREATE POLICY "Public can view public shootings"
ON public.shootings
FOR SELECT
TO anon
USING (show_on_public = true);
