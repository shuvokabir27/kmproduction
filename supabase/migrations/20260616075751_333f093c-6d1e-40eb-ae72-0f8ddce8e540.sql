
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name TEXT DEFAULT 'KM Shop',
  contact_phone TEXT,
  whatsapp_no TEXT,
  contact_email TEXT,
  address TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  youtube_url TEXT,
  footer_about TEXT,
  footer_copyright TEXT,
  free_delivery BOOLEAN DEFAULT false,
  logo_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site_settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Product admins manage site_settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'product_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'product_admin'));

INSERT INTO public.site_settings (site_name) VALUES ('KM Shop');

CREATE TABLE public.app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'android',
  file_path TEXT,
  file_url TEXT,
  file_size BIGINT,
  release_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_versions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_versions TO authenticated;
GRANT ALL ON public.app_versions TO service_role;

ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active app_versions" ON public.app_versions FOR SELECT USING (true);
CREATE POLICY "Product admins manage app_versions" ON public.app_versions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'product_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'product_admin'));
