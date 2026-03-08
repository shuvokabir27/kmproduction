
CREATE TABLE public.popular_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.popular_videos ENABLE ROW LEVEL SECURITY;

-- Public can view active videos
CREATE POLICY "Public can view active popular videos"
ON public.popular_videos
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Admins can manage all
CREATE POLICY "Admins can manage popular videos"
ON public.popular_videos
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));
