-- 1. Add actor fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stage_name text,
  ADD COLUMN IF NOT EXISTS age_range text,
  ADD COLUMN IF NOT EXISTS current_location text,
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS skin_tone text,
  ADD COLUMN IF NOT EXISTS hair_type text,
  ADD COLUMN IF NOT EXISTS eye_color text,
  ADD COLUMN IF NOT EXISTS body_measurements text,
  ADD COLUMN IF NOT EXISTS showreel_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text,
  ADD COLUMN IF NOT EXISTS special_skills text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS acting_education text,
  ADD COLUMN IF NOT EXISTS is_actor boolean DEFAULT false;

-- 2. Actor portfolio images table
CREATE TABLE IF NOT EXISTS public.actor_portfolio_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  category text NOT NULL DEFAULT 'headshot',
  caption text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.actor_portfolio_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portfolio images viewable by everyone"
  ON public.actor_portfolio_images FOR SELECT
  USING (true);

CREATE POLICY "Admins manage portfolio images"
  ON public.actor_portfolio_images FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members manage own portfolio images"
  ON public.actor_portfolio_images FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- 3. Acting credits table
CREATE TABLE IF NOT EXISTS public.actor_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'drama',
  project_title text NOT NULL,
  character_name text,
  director text,
  production_house text,
  release_year integer,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.actor_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acting credits viewable by everyone"
  ON public.actor_credits FOR SELECT
  USING (true);

CREATE POLICY "Admins manage acting credits"
  ON public.actor_credits FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members manage own acting credits"
  ON public.actor_credits FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_actor_portfolio_images_profile ON public.actor_portfolio_images(profile_id);
CREATE INDEX IF NOT EXISTS idx_actor_credits_profile ON public.actor_credits(profile_id);