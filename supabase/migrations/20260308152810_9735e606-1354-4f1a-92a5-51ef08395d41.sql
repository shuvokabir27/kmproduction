ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_on_public boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_display_order integer DEFAULT 0;