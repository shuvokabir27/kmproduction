
-- Create news_publishers table
CREATE TABLE public.news_publishers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  photo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.news_publishers ENABLE ROW LEVEL SECURITY;

-- Admins can manage publishers
CREATE POLICY "Admins can manage publishers" ON public.news_publishers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public can view publishers
CREATE POLICY "Public can view publishers" ON public.news_publishers FOR SELECT USING (true);

-- Add publisher_id to news table
ALTER TABLE public.news ADD COLUMN publisher_id uuid REFERENCES public.news_publishers(id) ON DELETE SET NULL;
