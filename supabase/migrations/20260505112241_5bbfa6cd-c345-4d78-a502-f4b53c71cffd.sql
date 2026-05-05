
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS unit_type TEXT NOT NULL DEFAULT 'piece',
  ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS variant_label TEXT;
