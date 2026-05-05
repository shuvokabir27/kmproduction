
-- Shop customers table for KM Shop mobile-based login
CREATE TABLE public.shop_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  full_name TEXT,
  password_hash TEXT NOT NULL,
  session_token TEXT,
  session_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_customers_phone ON public.shop_customers(phone);
CREATE INDEX idx_shop_customers_token ON public.shop_customers(session_token);

ALTER TABLE public.shop_customers ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage shop customers from the client SDK
CREATE POLICY "Admins manage shop customers"
ON public.shop_customers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_shop_customers_updated_at
BEFORE UPDATE ON public.shop_customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link orders to customer for easier lookup (optional column)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shop_customer_id UUID REFERENCES public.shop_customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_shop_customer ON public.orders(shop_customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
