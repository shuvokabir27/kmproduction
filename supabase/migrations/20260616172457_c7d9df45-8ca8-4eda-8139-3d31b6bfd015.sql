ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS hero_title text,
  ADD COLUMN IF NOT EXISTS hero_subtitle text,
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS hero_badge text,
  ADD COLUMN IF NOT EXISTS hero_cta_label text,
  ADD COLUMN IF NOT EXISTS hero_cta_link text;