
-- 1) Replace name-based artist auth check with profile_id-based check
CREATE OR REPLACE FUNCTION public.member_owns_client_artist_row(_user_id uuid, _artist_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- _artist_name kept for backward compatibility with existing RLS policy signature.
  -- Authorization now uses the direct profile_id foreign key only.
  SELECT EXISTS (
    SELECT 1
    FROM public.client_project_artists cpa
    JOIN public.profiles p ON p.id = cpa.profile_id
    WHERE p.user_id = _user_id
      AND cpa.artist_name = _artist_name
  );
$$;

-- 2) Pin search_path on previously-mutable functions
ALTER FUNCTION public.bn_to_en(text) SET search_path = public;
ALTER FUNCTION public.slugify(text) SET search_path = public;
ALTER FUNCTION public.generate_unique_product_slug(text, uuid) SET search_path = public;
ALTER FUNCTION public.products_set_slug() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
