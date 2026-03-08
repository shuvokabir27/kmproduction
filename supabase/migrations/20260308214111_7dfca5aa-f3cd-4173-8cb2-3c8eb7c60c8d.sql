
CREATE TABLE public.news_ticker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.news_ticker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ticker" ON public.news_ticker
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view active ticker" ON public.news_ticker
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Add ticker settings to site_settings
ALTER TABLE public.site_settings 
  ADD COLUMN IF NOT EXISTS ticker_speed integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS ticker_enabled boolean DEFAULT true;
