
-- 1. Fix profiles: restrict SELECT to owner + admin
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

CREATE POLICY "Owner or admin can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- 2. Create a safe view that all authenticated users can query for basic profile info
-- This view runs as the definer (bypasses RLS) but masks financial columns
CREATE OR REPLACE VIEW public.profiles_safe AS
SELECT
  id, user_id, member_id, full_name, full_name_en,
  photo_url, cover_url, designation, designation_en,
  bio, bio_en, short_bio, short_bio_en,
  education, education_en, achievements, achievements_en,
  favorite_actor, favorite_actor_en, favorite_actress, favorite_actress_en,
  favorite_color, favorite_color_en, favorite_dress, favorite_dress_en,
  favorite_food, favorite_food_en,
  is_active, is_verified, joining_date, date_of_birth,
  show_on_public, public_display_order,
  salary_type, salary_type_changed_at,
  last_seen_at, created_at, updated_at,
  -- Sensitive columns: only show to owner or admin
  CASE WHEN auth.uid() = user_id OR has_role(auth.uid(), 'admin') THEN email ELSE NULL END AS email,
  CASE WHEN auth.uid() = user_id OR has_role(auth.uid(), 'admin') THEN phone ELSE NULL END AS phone,
  CASE WHEN auth.uid() = user_id OR has_role(auth.uid(), 'admin') THEN address ELSE NULL END AS address,
  CASE WHEN auth.uid() = user_id OR has_role(auth.uid(), 'admin') THEN address_en ELSE NULL END AS address_en,
  CASE WHEN auth.uid() = user_id OR has_role(auth.uid(), 'admin') THEN bank_name ELSE NULL END AS bank_name,
  CASE WHEN auth.uid() = user_id OR has_role(auth.uid(), 'admin') THEN bank_account_no ELSE NULL END AS bank_account_no,
  CASE WHEN auth.uid() = user_id OR has_role(auth.uid(), 'admin') THEN bank_account_holder ELSE NULL END AS bank_account_holder,
  CASE WHEN auth.uid() = user_id OR has_role(auth.uid(), 'admin') THEN bkash_no ELSE NULL END AS bkash_no,
  CASE WHEN auth.uid() = user_id OR has_role(auth.uid(), 'admin') THEN bkash_holder ELSE NULL END AS bkash_holder,
  CASE WHEN auth.uid() = user_id OR has_role(auth.uid(), 'admin') THEN nagad_no ELSE NULL END AS nagad_no,
  CASE WHEN auth.uid() = user_id OR has_role(auth.uid(), 'admin') THEN nagad_holder ELSE NULL END AS nagad_holder,
  CASE WHEN auth.uid() = user_id OR has_role(auth.uid(), 'admin') THEN daily_rate ELSE NULL END AS daily_rate,
  CASE WHEN auth.uid() = user_id OR has_role(auth.uid(), 'admin') THEN monthly_salary ELSE NULL END AS monthly_salary,
  CASE WHEN auth.uid() = user_id OR has_role(auth.uid(), 'admin') THEN previous_balance ELSE NULL END AS previous_balance
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_safe TO authenticated;

-- 3. Fix client-scripts storage bucket: make private
UPDATE storage.buckets SET public = false WHERE id = 'client-scripts';

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Public can view client script images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload client scripts" ON storage.objects;

-- Create scoped policies for client-scripts
CREATE POLICY "Owners or admins can view client script files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-scripts'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users can upload to own folder in client-scripts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-scripts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own files in client-scripts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-scripts'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'admin')
  )
);
