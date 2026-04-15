CREATE TABLE public.product_weight_prices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  weight_label text NOT NULL,
  weight_kg numeric NOT NULL DEFAULT 1,
  label text DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  discount_price numeric DEFAULT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_weight_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active weight prices"
ON public.product_weight_prices FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage weight prices"
ON public.product_weight_prices FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'product_admin'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'product_admin'));

-- Seed with current hardcoded data
INSERT INTO public.product_weight_prices (weight_label, weight_kg, label, price, discount_price, sort_order) VALUES
('৫০০ গ্রাম', 0.5, 'ট্রায়াল প্যাক', 375, 245, 1),
('১ কেজি', 1, 'ফ্যামিলি প্যাক', 700, 490, 2),
('১.৫ কেজি', 1.5, 'সুপার সেভার', 1050, 680, 3),
('২ কেজি', 2, 'মেগা প্যাক', 1400, 860, 4);