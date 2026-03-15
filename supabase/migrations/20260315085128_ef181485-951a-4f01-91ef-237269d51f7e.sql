ALTER TABLE public.services ADD COLUMN IF NOT EXISTS price_per_hour numeric DEFAULT NULL;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS edited_photos_per_hour integer DEFAULT 20;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS unlimited_photos_per_hour boolean DEFAULT true;