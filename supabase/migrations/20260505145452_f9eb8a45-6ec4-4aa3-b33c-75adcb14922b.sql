CREATE TYPE shop_offer_type AS ENUM ('percentage', 'fixed', 'free_delivery');

CREATE TABLE public.shop_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  product_id uuid,
  discount_type shop_offer_type NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  image_url text,
  badge_text text DEFAULT 'বিশেষ অফার',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  show_popup boolean NOT NULL DEFAULT true,
  popup_priority integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active offers" ON public.shop_offers
FOR SELECT USING (is_active = true AND (ends_at IS NULL OR ends_at > now()) AND starts_at <= now());

CREATE POLICY "Product admins manage offers" ON public.shop_offers
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'product_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'product_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_shop_offers_updated_at
BEFORE UPDATE ON public.shop_offers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();