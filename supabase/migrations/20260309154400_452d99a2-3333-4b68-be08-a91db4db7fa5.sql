
-- Profile comments table
CREATE TABLE public.profile_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  commenter_name text NOT NULL,
  commenter_email text,
  content text NOT NULL,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Profile ratings table (one rating per email per profile)
CREATE TABLE public.profile_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rater_name text NOT NULL,
  rater_email text,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, rater_email)
);

-- RLS
ALTER TABLE public.profile_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved comments
CREATE POLICY "Public can view approved comments"
  ON public.profile_comments FOR SELECT TO public
  USING (is_approved = true);

-- Anyone can insert comments
CREATE POLICY "Anyone can insert comments"
  ON public.profile_comments FOR INSERT TO public
  WITH CHECK (true);

-- Admins can manage all comments
CREATE POLICY "Admins can manage comments"
  ON public.profile_comments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view ratings
CREATE POLICY "Public can view ratings"
  ON public.profile_ratings FOR SELECT TO public
  USING (true);

-- Anyone can insert ratings
CREATE POLICY "Anyone can insert ratings"
  ON public.profile_ratings FOR INSERT TO public
  WITH CHECK (true);

-- Admins can manage all ratings
CREATE POLICY "Admins can manage ratings"
  ON public.profile_ratings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
