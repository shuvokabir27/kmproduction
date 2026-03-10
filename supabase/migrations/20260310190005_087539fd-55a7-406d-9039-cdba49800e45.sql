
CREATE POLICY "Members can view ongoing shootings"
ON public.shootings
FOR SELECT
TO authenticated
USING (status = 'ongoing');
