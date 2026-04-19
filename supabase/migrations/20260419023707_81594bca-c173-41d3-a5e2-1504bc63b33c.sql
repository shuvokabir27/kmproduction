CREATE OR REPLACE FUNCTION public.member_can_access_freelance_project(_project_id uuid)
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
    WHERE p.user_id = auth.uid()
      AND (fa.id IS NOT NULL OR cpa.id IS NOT NULL)
  );
$$;

DROP POLICY IF EXISTS "Admins manage freelance assignments" ON public.freelance_assignments;
DROP POLICY IF EXISTS "Members can view own freelance assignments" ON public.freelance_assignments;
DROP POLICY IF EXISTS "Admins manage freelance projects" ON public.freelance_projects;
DROP POLICY IF EXISTS "Members can view freelance projects tied to their work" ON public.freelance_projects;
DROP POLICY IF EXISTS "Admins manage client project artists" ON public.client_project_artists;
DROP POLICY IF EXISTS "Members can view own client artist rows" ON public.client_project_artists;

CREATE POLICY "Admins manage freelance assignments"
ON public.freelance_assignments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view own freelance assignments"
ON public.freelance_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = freelance_assignments.member_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Admins manage freelance projects"
ON public.freelance_projects
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view freelance projects tied to their work"
ON public.freelance_projects
FOR SELECT
TO authenticated
USING (public.member_can_access_freelance_project(id));

CREATE POLICY "Admins manage client project artists"
ON public.client_project_artists
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view own client artist rows"
ON public.client_project_artists
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (
        client_project_artists.artist_name = p.full_name
        OR client_project_artists.artist_name = COALESCE(p.full_name_en, '')
      )
  )
);