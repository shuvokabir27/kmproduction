ALTER TABLE public.shop_offers
  ADD COLUMN combo_products jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN combo_price numeric;