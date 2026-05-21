ALTER TABLE public.site_settings 
  ADD COLUMN IF NOT EXISTS top_strip_text text DEFAULT 'আমাদের যে কোন পণ্য অর্ডার করতে WhatsApp অথবা কল করুন।',
  ADD COLUMN IF NOT EXISTS top_strip_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS top_strip_speed integer NOT NULL DEFAULT 30;