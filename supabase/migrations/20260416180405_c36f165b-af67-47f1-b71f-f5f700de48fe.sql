DROP POLICY IF EXISTS "Admins can manage popular videos" ON public.popular_videos;

CREATE POLICY "Admins can manage popular videos"
ON public.popular_videos
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'product_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'product_admin'::app_role));