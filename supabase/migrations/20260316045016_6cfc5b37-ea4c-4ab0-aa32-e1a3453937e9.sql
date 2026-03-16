
CREATE TABLE public.news_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.news_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage news_categories" ON public.news_categories
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view news_categories" ON public.news_categories
  FOR SELECT TO public
  USING (true);

INSERT INTO public.news_categories (value, label, sort_order) VALUES
  ('entertainment', 'বিনোদন', 1),
  ('funny', 'হাসির খবর', 2),
  ('behind-the-scenes', 'নেপথ্যে', 3),
  ('announcement', 'ঘোষণা', 4);
