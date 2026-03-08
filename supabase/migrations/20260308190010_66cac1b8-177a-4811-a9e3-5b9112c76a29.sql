
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS whatsapp_no TEXT,
ADD COLUMN IF NOT EXISTS facebook_pages JSONB DEFAULT '[]'::jsonb;
