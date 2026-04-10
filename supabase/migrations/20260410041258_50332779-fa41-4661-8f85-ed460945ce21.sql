
-- Drop the security definer view
DROP VIEW IF EXISTS public.profiles_safe;

-- Re-create the view with security_invoker = true
CREATE OR REPLACE VIEW public.profiles_safe
WITH (security_invoker = true) AS
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

-- Add back a permissive policy for all authenticated to SELECT from profiles
-- (needed for the security_invoker view to work)
-- The view masks financial columns; the base table policy now allows reads
CREATE POLICY "Authenticated can read profiles via safe view"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- But drop the owner-only policy we just created since we now have the broad one back
DROP POLICY IF EXISTS "Owner or admin can view profiles" ON public.profiles;

GRANT SELECT ON public.profiles_safe TO authenticated;
