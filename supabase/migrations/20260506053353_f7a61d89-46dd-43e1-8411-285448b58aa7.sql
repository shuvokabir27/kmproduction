
-- Free Delivery Campaign feature
CREATE TABLE public.free_delivery_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'ফ্রি ডেলিভারি অফার',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  max_orders_per_phone integer NOT NULL DEFAULT 1,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Allowed products for the campaign
CREATE TABLE public.free_delivery_campaign_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.free_delivery_campaigns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, product_id)
);

-- Tiers (e.g. 3 / 5 / 10 distinct products required)
CREATE TABLE public.free_delivery_campaign_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.free_delivery_campaigns(id) ON DELETE CASCADE,
  label text NOT NULL,
  required_products integer NOT NULL CHECK (required_products > 0),
  reward_text text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Order tracking — to enforce per-phone limit
CREATE TABLE public.free_delivery_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.free_delivery_campaigns(id) ON DELETE CASCADE,
  tier_id uuid REFERENCES public.free_delivery_campaign_tiers(id) ON DELETE SET NULL,
  customer_phone text NOT NULL,
  customer_name text NOT NULL,
  customer_address text NOT NULL,
  shared_order_number integer,
  product_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fd_orders_phone ON public.free_delivery_orders(customer_phone);
CREATE INDEX idx_fd_orders_campaign ON public.free_delivery_orders(campaign_id);

-- updated_at trigger
CREATE TRIGGER trg_fd_campaigns_updated
  BEFORE UPDATE ON public.free_delivery_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.free_delivery_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_delivery_campaign_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_delivery_campaign_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_delivery_orders ENABLE ROW LEVEL SECURITY;

-- Public can read active campaigns and their tiers/products
CREATE POLICY "Public can view active campaigns" ON public.free_delivery_campaigns
  FOR SELECT USING (is_active = true AND (ends_at IS NULL OR ends_at > now()) AND starts_at <= now());

CREATE POLICY "Admins manage campaigns" ON public.free_delivery_campaigns
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'product_admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'product_admin'::app_role));

CREATE POLICY "Public can view campaign products" ON public.free_delivery_campaign_products
  FOR SELECT USING (campaign_id IN (SELECT id FROM public.free_delivery_campaigns WHERE is_active = true));

CREATE POLICY "Admins manage campaign products" ON public.free_delivery_campaign_products
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'product_admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'product_admin'::app_role));

CREATE POLICY "Public can view campaign tiers" ON public.free_delivery_campaign_tiers
  FOR SELECT USING (campaign_id IN (SELECT id FROM public.free_delivery_campaigns WHERE is_active = true));

CREATE POLICY "Admins manage campaign tiers" ON public.free_delivery_campaign_tiers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'product_admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'product_admin'::app_role));

-- Orders: anyone can insert, only admins can view
CREATE POLICY "Anyone can place free delivery order" ON public.free_delivery_orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins view free delivery orders" ON public.free_delivery_orders
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'product_admin'::app_role));

-- Helper function: count of orders for a phone in a campaign (callable anon)
CREATE OR REPLACE FUNCTION public.free_delivery_phone_order_count(_campaign_id uuid, _phone text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.free_delivery_orders
   WHERE campaign_id = _campaign_id AND customer_phone = _phone;
$$;

GRANT EXECUTE ON FUNCTION public.free_delivery_phone_order_count(uuid, text) TO anon, authenticated;
