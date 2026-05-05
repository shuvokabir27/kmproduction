
-- Add weight to products (in grams)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS weight_grams numeric NOT NULL DEFAULT 0;

-- Delivery settings (single row)
CREATE TABLE IF NOT EXISTS public.delivery_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_weight_grams numeric NOT NULL DEFAULT 1000,
  base_charge numeric NOT NULL DEFAULT 120,
  extra_charge_per_kg numeric NOT NULL DEFAULT 20,
  free_delivery_threshold numeric NOT NULL DEFAULT 2000,
  free_delivery_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view delivery settings" ON public.delivery_settings;
CREATE POLICY "Anyone can view delivery settings"
  ON public.delivery_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Product admins manage delivery settings" ON public.delivery_settings;
CREATE POLICY "Product admins manage delivery settings"
  ON public.delivery_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'product_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'product_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Seed default row if none exists
INSERT INTO public.delivery_settings (base_weight_grams, base_charge, extra_charge_per_kg, free_delivery_threshold, free_delivery_enabled)
SELECT 1000, 120, 20, 2000, true
WHERE NOT EXISTS (SELECT 1 FROM public.delivery_settings);

-- Track delivery charge on orders (additive)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_charge numeric NOT NULL DEFAULT 0;
