ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS whatsapp_offer_message text DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS whatsapp_offer_image text DEFAULT '';