
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES public.product_categories(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL UNIQUE,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active categories"
  ON public.product_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Product admins manage categories"
  ON public.product_categories FOR ALL
  USING (has_role(auth.uid(), 'product_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'product_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Seed: main categories + subs (including dedicated আচার as a main category)
WITH mains AS (
  INSERT INTO public.product_categories (label, value, icon, sort_order) VALUES
    ('আচার', 'achar', '🥭', 1),
    ('খাবার ও শুঁটকি', 'food_shutki', '🍛', 2),
    ('ঝিনুক ও উপহার সামগ্রী', 'shell_gifts', '🐚', 3),
    ('রাখাইন ফ্যাশন ও তাঁত', 'rakhain_fashion', '👘', 4),
    ('গৃহসজ্জা ও হস্তশিল্প', 'home_decor', '🪵', 5),
    ('অন্যান্য', 'others', '📦', 6)
  RETURNING id, value
)
INSERT INTO public.product_categories (parent_id, label, value, sort_order)
SELECT m.id, s.label, s.value, s.sort_order FROM mains m
JOIN (VALUES
  ('achar', 'আমের আচার', 'achar_aam', 1),
  ('achar', 'বরই/কুলের আচার', 'achar_borai', 2),
  ('achar', 'জলপাই আচার', 'achar_jolpai', 3),
  ('achar', 'রসুন আচার', 'achar_roshun', 4),
  ('achar', 'মিক্সড আচার', 'achar_mixed', 5),
  ('food_shutki', 'প্রিমিয়াম শুঁটকি', 'premium_shutki', 1),
  ('food_shutki', 'বালাচাও স্পেশাল', 'bala_chao', 2),
  ('shell_gifts', 'ঝিনুকের অলংকার', 'shell_jewelry', 1),
  ('shell_gifts', 'কাস্টমাইজড শোপিস', 'custom_showpieces', 2),
  ('shell_gifts', 'স্যুভেনিয়ার ও গিফট', 'souvenirs', 3),
  ('rakhain_fashion', 'তাঁতের শীতবস্ত্র', 'woven_winter_wear', 1),
  ('rakhain_fashion', 'ঐতিহ্যবাহী পোশাক', 'traditional_attire', 2),
  ('rakhain_fashion', 'হস্তশিল্প ও ব্যাগ', 'handicrafts_bags', 3),
  ('home_decor', 'নারিকেলের শোপিস', 'coconut_shell_crafts', 1),
  ('home_decor', 'বাঁশ ও কাঠের তৈরি', 'bamboo_wooden', 2),
  ('home_decor', 'খেলনা ও অন্যান্য', 'toys_others', 3),
  ('others', 'তালের গুড়', 'taler_gur', 1)
) AS s(parent_value, label, value, sort_order) ON s.parent_value = m.value;
