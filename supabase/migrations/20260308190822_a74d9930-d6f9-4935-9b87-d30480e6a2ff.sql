
-- Gallery images table
CREATE TABLE public.gallery_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  image_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

-- Public can view active images
CREATE POLICY "Public can view active gallery images"
  ON public.gallery_images FOR SELECT
  USING (is_active = true);

-- Admins can manage
CREATE POLICY "Admins can manage gallery images"
  ON public.gallery_images FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for gallery
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true);

-- Storage policies
CREATE POLICY "Public can view gallery files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery');

CREATE POLICY "Admins can upload gallery files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'gallery' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete gallery files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'gallery' AND has_role(auth.uid(), 'admin'::app_role));
