ALTER TABLE public.site_settings 
  ADD COLUMN IF NOT EXISTS rocket_payment_no text,
  ADD COLUMN IF NOT EXISTS rocket_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_sender_no text,
  ADD COLUMN IF NOT EXISTS payment_trx_id text;