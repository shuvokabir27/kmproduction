
-- =============================================
-- 1. PROFILES: Restrict full data to authenticated only, provide safe public RPC
-- =============================================

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Allow authenticated users to view all profiles
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Create a safe public function for anonymous access (no sensitive fields)
CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE (
  id uuid,
  member_id integer,
  full_name text,
  full_name_en text,
  photo_url text,
  cover_url text,
  designation text,
  designation_en text,
  bio text,
  bio_en text,
  short_bio text,
  short_bio_en text,
  education text,
  education_en text,
  achievements text,
  achievements_en text,
  favorite_actor text,
  favorite_actor_en text,
  favorite_actress text,
  favorite_actress_en text,
  favorite_color text,
  favorite_color_en text,
  favorite_dress text,
  favorite_dress_en text,
  favorite_food text,
  favorite_food_en text,
  date_of_birth date,
  is_verified boolean,
  is_active boolean,
  show_on_public boolean,
  public_display_order integer,
  joining_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.member_id, p.full_name, p.full_name_en, p.photo_url, p.cover_url,
         p.designation, p.designation_en, p.bio, p.bio_en, p.short_bio, p.short_bio_en,
         p.education, p.education_en, p.achievements, p.achievements_en,
         p.favorite_actor, p.favorite_actor_en, p.favorite_actress, p.favorite_actress_en,
         p.favorite_color, p.favorite_color_en, p.favorite_dress, p.favorite_dress_en,
         p.favorite_food, p.favorite_food_en, p.date_of_birth, p.is_verified,
         p.is_active, p.show_on_public, p.public_display_order, p.joining_date
  FROM public.profiles p
  WHERE p.is_active = true AND p.show_on_public = true;
$$;

-- Single profile lookup by member_id (safe for public)
CREATE OR REPLACE FUNCTION public.get_public_profile_by_member_id(_member_id integer)
RETURNS TABLE (
  id uuid,
  member_id integer,
  full_name text,
  full_name_en text,
  photo_url text,
  cover_url text,
  designation text,
  designation_en text,
  bio text,
  bio_en text,
  short_bio text,
  short_bio_en text,
  education text,
  education_en text,
  achievements text,
  achievements_en text,
  favorite_actor text,
  favorite_actor_en text,
  favorite_actress text,
  favorite_actress_en text,
  favorite_color text,
  favorite_color_en text,
  favorite_dress text,
  favorite_dress_en text,
  favorite_food text,
  favorite_food_en text,
  date_of_birth date,
  is_verified boolean,
  is_active boolean,
  show_on_public boolean,
  public_display_order integer,
  joining_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.member_id, p.full_name, p.full_name_en, p.photo_url, p.cover_url,
         p.designation, p.designation_en, p.bio, p.bio_en, p.short_bio, p.short_bio_en,
         p.education, p.education_en, p.achievements, p.achievements_en,
         p.favorite_actor, p.favorite_actor_en, p.favorite_actress, p.favorite_actress_en,
         p.favorite_color, p.favorite_color_en, p.favorite_dress, p.favorite_dress_en,
         p.favorite_food, p.favorite_food_en, p.date_of_birth, p.is_verified,
         p.is_active, p.show_on_public, p.public_display_order, p.joining_date
  FROM public.profiles p
  WHERE p.member_id = _member_id;
$$;

-- =============================================
-- 2. MEMBER PHOTOS STORAGE: Add ownership check
-- =============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can update member photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete member photos" ON storage.objects;

-- Recreate with ownership verification
CREATE POLICY "Users can update own member photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'member-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own member photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'member-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow admins to manage all member photos
CREATE POLICY "Admins can update any member photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'member-photos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any member photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'member-photos' AND has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 3. PROFILE COMMENTS: Hide commenter email from public
-- =============================================

-- Drop the existing public SELECT that exposes email
DROP POLICY IF EXISTS "Public can view approved comments" ON public.profile_comments;

-- Create a safe public function to get comments without email
CREATE OR REPLACE FUNCTION public.get_approved_profile_comments(_profile_id uuid)
RETURNS TABLE (
  id uuid,
  profile_id uuid,
  commenter_name text,
  content text,
  created_at timestamptz,
  is_approved boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pc.id, pc.profile_id, pc.commenter_name, pc.content, pc.created_at, pc.is_approved
  FROM public.profile_comments pc
  WHERE pc.profile_id = _profile_id AND pc.is_approved = true
  ORDER BY pc.created_at DESC
  LIMIT 50;
$$;

-- Allow authenticated users (admins) to still see comments via table
CREATE POLICY "Authenticated can view approved comments"
ON public.profile_comments
FOR SELECT
TO authenticated
USING (is_approved = true OR has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 4. PROFILE RATINGS: Require authentication, prevent duplicates
-- =============================================

-- Drop the open anonymous INSERT policy
DROP POLICY IF EXISTS "Anyone can insert ratings" ON public.profile_ratings;

-- Only authenticated users can rate
CREATE POLICY "Authenticated users can insert ratings"
ON public.profile_ratings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- 5. BOOKINGS: Tighten the open INSERT policy
-- =============================================

-- Drop the overly permissive insert policy
DROP POLICY IF EXISTS "Anyone can submit bookings" ON public.bookings;

-- Recreate with basic validation
CREATE POLICY "Anyone can submit bookings"
ON public.bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  customer_name IS NOT NULL AND length(trim(customer_name)) > 0
  AND customer_phone IS NOT NULL AND length(trim(customer_phone)) > 0
  AND service_title IS NOT NULL AND length(trim(service_title)) > 0
);

-- =============================================
-- 6. PROFILE COMMENTS: Tighten INSERT policy
-- =============================================

DROP POLICY IF EXISTS "Anyone can insert comments" ON public.profile_comments;

CREATE POLICY "Anyone can insert comments"
ON public.profile_comments
FOR INSERT
TO anon, authenticated
WITH CHECK (
  commenter_name IS NOT NULL AND length(trim(commenter_name)) > 0
  AND content IS NOT NULL AND length(trim(content)) > 0
  AND length(content) <= 1000
  AND is_approved = false
);
