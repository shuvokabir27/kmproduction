ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS spotlight_priority integer NOT NULL DEFAULT 1;

DROP FUNCTION IF EXISTS public.get_public_profiles();

CREATE OR REPLACE FUNCTION public.get_public_profiles()
 RETURNS TABLE(id uuid, member_id integer, full_name text, full_name_en text, photo_url text, cover_url text, designation text, designation_en text, bio text, bio_en text, short_bio text, short_bio_en text, education text, education_en text, achievements text, achievements_en text, favorite_actor text, favorite_actor_en text, favorite_actress text, favorite_actress_en text, favorite_color text, favorite_color_en text, favorite_dress text, favorite_dress_en text, favorite_food text, favorite_food_en text, date_of_birth date, is_verified boolean, is_active boolean, show_on_public boolean, public_display_order integer, joining_date date, spotlight_priority integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.member_id, p.full_name, p.full_name_en, p.photo_url, p.cover_url,
         p.designation, p.designation_en, p.bio, p.bio_en, p.short_bio, p.short_bio_en,
         p.education, p.education_en, p.achievements, p.achievements_en,
         p.favorite_actor, p.favorite_actor_en, p.favorite_actress, p.favorite_actress_en,
         p.favorite_color, p.favorite_color_en, p.favorite_dress, p.favorite_dress_en,
         p.favorite_food, p.favorite_food_en, p.date_of_birth, p.is_verified,
         p.is_active, p.show_on_public, p.public_display_order, p.joining_date,
         p.spotlight_priority
  FROM public.profiles p
  WHERE p.is_active = true AND p.show_on_public = true;
$function$;