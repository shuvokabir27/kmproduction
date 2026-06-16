
CREATE TABLE public.product_sliders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  product_ids uuid[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  autoplay boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_sliders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_sliders TO authenticated;
GRANT ALL ON public.product_sliders TO service_role;

ALTER TABLE public.product_sliders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active sliders"
  ON public.product_sliders FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage sliders"
  ON public.product_sliders FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'product_admin') OR public.has_role(auth.uid(), 'site_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'product_admin') OR public.has_role(auth.uid(), 'site_manager'));

CREATE TRIGGER update_product_sliders_updated_at
  BEFORE UPDATE ON public.product_sliders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
