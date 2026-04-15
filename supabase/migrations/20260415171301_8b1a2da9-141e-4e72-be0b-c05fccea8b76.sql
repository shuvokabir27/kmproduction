ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS offer_end_date timestamptz DEFAULT (now() + interval '7 days');