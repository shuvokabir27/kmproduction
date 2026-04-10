
-- Remove the broad policy we just added
DROP POLICY IF EXISTS "Authenticated can read profiles via safe view" ON public.profiles;

-- Drop the view (will use function instead)
DROP VIEW IF EXISTS public.profiles_safe;

-- Add restricted policy: only owner or admin can SELECT from profiles
CREATE POLICY "Owner or admin can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Create a SECURITY DEFINER function that returns profiles with masked financial data
CREATE OR REPLACE FUNCTION public.get_profiles_safe()
RETURNS TABLE (
  id uuid,
  user_id uuid,
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
  is_active boolean,
  is_verified boolean,
  joining_date date,
  date_of_birth date,
  show_on_public boolean,
  public_display_order integer,
  salary_type salary_type,
  salary_type_changed_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  email text,
  phone text,
  address text,
  address_en text,
  daily_rate numeric,
  monthly_salary numeric,
  previous_balance numeric,
  bank_name text,
  bank_account_no text,
  bank_account_holder text,
  bkash_no text,
  bkash_holder text,
  nagad_no text,
  nagad_holder text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.user_id, p.member_id, p.full_name, p.full_name_en,
    p.photo_url, p.cover_url, p.designation, p.designation_en,
    p.bio, p.bio_en, p.short_bio, p.short_bio_en,
    p.education, p.education_en, p.achievements, p.achievements_en,
    p.favorite_actor, p.favorite_actor_en, p.favorite_actress, p.favorite_actress_en,
    p.favorite_color, p.favorite_color_en, p.favorite_dress, p.favorite_dress_en,
    p.favorite_food, p.favorite_food_en,
    p.is_active, p.is_verified, p.joining_date, p.date_of_birth,
    p.show_on_public, p.public_display_order,
    p.salary_type, p.salary_type_changed_at,
    p.last_seen_at, p.created_at, p.updated_at,
    CASE WHEN auth.uid() = p.user_id OR has_role(auth.uid(), 'admin') THEN p.email ELSE NULL END,
    CASE WHEN auth.uid() = p.user_id OR has_role(auth.uid(), 'admin') THEN p.phone ELSE NULL END,
    CASE WHEN auth.uid() = p.user_id OR has_role(auth.uid(), 'admin') THEN p.address ELSE NULL END,
    CASE WHEN auth.uid() = p.user_id OR has_role(auth.uid(), 'admin') THEN p.address_en ELSE NULL END,
    CASE WHEN auth.uid() = p.user_id OR has_role(auth.uid(), 'admin') THEN p.daily_rate ELSE NULL END,
    CASE WHEN auth.uid() = p.user_id OR has_role(auth.uid(), 'admin') THEN p.monthly_salary ELSE NULL END,
    CASE WHEN auth.uid() = p.user_id OR has_role(auth.uid(), 'admin') THEN p.previous_balance ELSE NULL END,
    CASE WHEN auth.uid() = p.user_id OR has_role(auth.uid(), 'admin') THEN p.bank_name ELSE NULL END,
    CASE WHEN auth.uid() = p.user_id OR has_role(auth.uid(), 'admin') THEN p.bank_account_no ELSE NULL END,
    CASE WHEN auth.uid() = p.user_id OR has_role(auth.uid(), 'admin') THEN p.bank_account_holder ELSE NULL END,
    CASE WHEN auth.uid() = p.user_id OR has_role(auth.uid(), 'admin') THEN p.bkash_no ELSE NULL END,
    CASE WHEN auth.uid() = p.user_id OR has_role(auth.uid(), 'admin') THEN p.bkash_holder ELSE NULL END,
    CASE WHEN auth.uid() = p.user_id OR has_role(auth.uid(), 'admin') THEN p.nagad_no ELSE NULL END,
    CASE WHEN auth.uid() = p.user_id OR has_role(auth.uid(), 'admin') THEN p.nagad_holder ELSE NULL END
  FROM public.profiles p;
$$;
