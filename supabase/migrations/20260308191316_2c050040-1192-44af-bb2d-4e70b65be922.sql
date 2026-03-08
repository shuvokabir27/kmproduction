
DROP POLICY "Public can view active gallery images" ON public.gallery_images;
DROP POLICY "Admins can manage gallery images" ON public.gallery_images;

-- Permissive SELECT for public
CREATE POLICY "Public can view active gallery images"
  ON public.gallery_images FOR SELECT
  USING (is_active = true);

-- Permissive ALL for admins
CREATE POLICY "Admins can manage gallery images"
  ON public.gallery_images FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
