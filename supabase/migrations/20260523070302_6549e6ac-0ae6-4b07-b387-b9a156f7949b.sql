
CREATE TABLE public.home_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  eyebrow TEXT,
  section_type TEXT NOT NULL DEFAULT 'manual',
  category_id UUID,
  badge_text TEXT,
  badge_color TEXT NOT NULL DEFAULT 'amber',
  accent_color TEXT NOT NULL DEFAULT 'amber',
  cta_label TEXT,
  cta_link TEXT,
  max_items INTEGER NOT NULL DEFAULT 12,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.home_section_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.home_sections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (section_id, product_id)
);

ALTER TABLE public.home_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_section_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active home sections"
  ON public.home_sections FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage home sections"
  ON public.home_sections FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'product_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'product_admin'::app_role));

CREATE POLICY "Anyone can view section products"
  ON public.home_section_products FOR SELECT
  USING (section_id IN (SELECT id FROM public.home_sections WHERE is_active = true));

CREATE POLICY "Admins manage section products"
  ON public.home_section_products FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'product_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'product_admin'::app_role));

CREATE TRIGGER update_home_sections_updated_at
  BEFORE UPDATE ON public.home_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_home_section_products_section ON public.home_section_products(section_id, sort_order);
