CREATE TYPE public.pricing_type AS ENUM ('hourly', 'per_minute', 'event', 'fixed');
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS pricing_type public.pricing_type DEFAULT 'fixed';