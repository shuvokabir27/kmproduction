
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS discount_percentage numeric DEFAULT NULL;
ALTER TABLE public.service_offers ADD COLUMN IF NOT EXISTS service_ids jsonb DEFAULT '[]'::jsonb;
