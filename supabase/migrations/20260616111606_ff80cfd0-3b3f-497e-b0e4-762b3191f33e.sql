
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('product_admin'::app_role, 'order_manager'::app_role, 'site_manager'::app_role)
  )
$$;

-- Orders: allow order_manager to view
DROP POLICY IF EXISTS "Admins can view orders" ON public.orders;
CREATE POLICY "Staff can view orders" ON public.orders
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'product_admin') OR public.has_role(auth.uid(), 'order_manager'));

-- Orders update for order management
DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
CREATE POLICY "Staff can update orders" ON public.orders
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'product_admin') OR public.has_role(auth.uid(), 'order_manager'))
WITH CHECK (public.has_role(auth.uid(), 'product_admin') OR public.has_role(auth.uid(), 'order_manager'));

DROP POLICY IF EXISTS "Staff can delete orders" ON public.orders;
CREATE POLICY "Staff can delete orders" ON public.orders
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'product_admin') OR public.has_role(auth.uid(), 'order_manager'));

-- Site settings: site_manager can manage
DROP POLICY IF EXISTS "Product admins manage site_settings" ON public.site_settings;
CREATE POLICY "Staff manage site_settings" ON public.site_settings
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'product_admin') OR public.has_role(auth.uid(), 'site_manager'))
WITH CHECK (public.has_role(auth.uid(), 'product_admin') OR public.has_role(auth.uid(), 'site_manager'));

-- App versions
DROP POLICY IF EXISTS "Product admins manage app_versions" ON public.app_versions;
CREATE POLICY "Staff manage app_versions" ON public.app_versions
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'product_admin') OR public.has_role(auth.uid(), 'site_manager'))
WITH CHECK (public.has_role(auth.uid(), 'product_admin') OR public.has_role(auth.uid(), 'site_manager'));

-- User roles: only super admin (product_admin) can manage other users' roles
DROP POLICY IF EXISTS "Super admin manages roles" ON public.user_roles;
CREATE POLICY "Super admin manages roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'product_admin'))
WITH CHECK (public.has_role(auth.uid(), 'product_admin'));
