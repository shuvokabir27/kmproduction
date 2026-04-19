-- Drop recursive policies on freelance_projects and client_project_artists
DROP POLICY IF EXISTS "Members can view projects via client_project_artists" ON public.freelance_projects;
DROP POLICY IF EXISTS "Members can view own assigned projects" ON public.freelance_projects;
DROP POLICY IF EXISTS "Members can view own client artist entries" ON public.client_project_artists;

-- The security-definer function member_can_access_freelance_project already covers
-- both freelance_assignments and client_project_artists matches without recursion.
-- Keep only the consolidated policy "Members can view freelance projects tied to their work".

-- Recreate a non-recursive member view policy on client_project_artists using a security-definer helper
CREATE OR REPLACE FUNCTION public.member_owns_client_artist_row(_user_id uuid, _artist_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id
      AND (_artist_name = p.full_name OR _artist_name = COALESCE(p.full_name_en, ''))
  );
$$;

DROP POLICY IF EXISTS "Members can view own client artist rows" ON public.client_project_artists;
CREATE POLICY "Members can view own client artist rows"
ON public.client_project_artists
FOR SELECT
TO authenticated
USING (public.member_owns_client_artist_row(auth.uid(), artist_name));