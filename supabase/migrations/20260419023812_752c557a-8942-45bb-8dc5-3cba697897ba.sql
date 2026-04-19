CREATE OR REPLACE FUNCTION public.member_can_access_freelance_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.freelance_assignments fa
      ON fa.member_id = p.id
     AND fa.project_id = _project_id
    LEFT JOIN public.client_project_artists cpa
      ON cpa.project_id = _project_id
     AND (cpa.artist_name = p.full_name OR cpa.artist_name = COALESCE(p.full_name_en, ''))
    WHERE p.user_id = _user_id
      AND (fa.id IS NOT NULL OR cpa.id IS NOT NULL)
  );
$$;

DROP POLICY IF EXISTS "Members can view freelance projects tied to their work" ON public.freelance_projects;

CREATE POLICY "Members can view freelance projects tied to their work"
ON public.freelance_projects
FOR SELECT
TO authenticated
USING (public.member_can_access_freelance_project(auth.uid(), id));