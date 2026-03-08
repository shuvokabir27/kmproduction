-- Add extra profile fields
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS achievements text,
  ADD COLUMN IF NOT EXISTS favorite_actor text,
  ADD COLUMN IF NOT EXISTS favorite_actress text,
  ADD COLUMN IF NOT EXISTS favorite_color text,
  ADD COLUMN IF NOT EXISTS favorite_dress text,
  ADD COLUMN IF NOT EXISTS favorite_food text,
  ADD COLUMN IF NOT EXISTS short_bio text;

-- Create favorite_works table for top 5 works
CREATE TABLE IF NOT EXISTS public.favorite_works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  video_url text,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.favorite_works ENABLE ROW LEVEL SECURITY;

-- Members can manage their own favorite works
CREATE POLICY "Members can manage own favorite works"
ON public.favorite_works FOR ALL TO authenticated
USING (member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
WITH CHECK (member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Admins can manage all
CREATE POLICY "Admins can manage all favorite works"
ON public.favorite_works FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can view
CREATE POLICY "Favorite works viewable by everyone"
ON public.favorite_works FOR SELECT TO public
USING (true);