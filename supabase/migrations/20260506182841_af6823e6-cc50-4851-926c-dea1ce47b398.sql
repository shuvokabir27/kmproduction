ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS description_html text,
  ADD COLUMN IF NOT EXISTS suggested_product_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];