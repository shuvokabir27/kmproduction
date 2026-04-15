ALTER TABLE public.site_settings ADD COLUMN bkash_payment_no text DEFAULT NULL;
ALTER TABLE public.site_settings ADD COLUMN nagad_payment_no text DEFAULT NULL;
ALTER TABLE public.site_settings ADD COLUMN bkash_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.site_settings ADD COLUMN nagad_enabled boolean NOT NULL DEFAULT false;