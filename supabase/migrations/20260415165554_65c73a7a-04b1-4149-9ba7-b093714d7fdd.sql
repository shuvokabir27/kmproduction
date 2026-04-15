CREATE POLICY "Product admins can manage site settings"
ON public.site_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'product_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'product_admin'::app_role));