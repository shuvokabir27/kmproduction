ALTER TABLE public.home_sections
ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS discount_value numeric NOT NULL DEFAULT 0;