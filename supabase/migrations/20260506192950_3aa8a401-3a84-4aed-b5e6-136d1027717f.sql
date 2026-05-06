ALTER TABLE public.shop_offers ADD COLUMN slug text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_shop_offers_slug ON public.shop_offers(slug);