
CREATE POLICY "Admins can view orders"
ON public.orders
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'product_admin'));

DROP POLICY IF EXISTS "Anyone can place orders" ON public.orders;
CREATE POLICY "Anyone can place orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  customer_name IS NOT NULL AND length(btrim(customer_name)) > 0
  AND customer_phone IS NOT NULL AND length(btrim(customer_phone)) >= 11
);

DROP POLICY IF EXISTS "Anyone can place free delivery order" ON public.free_delivery_orders;
CREATE POLICY "Anyone can place free delivery order"
ON public.free_delivery_orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  customer_name IS NOT NULL AND length(btrim(customer_name)) > 0
  AND customer_phone IS NOT NULL AND length(btrim(customer_phone)) >= 11
);
