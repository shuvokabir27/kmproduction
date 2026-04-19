
-- Allow members to view freelance_projects they are assigned to (via freelance_assignments)
CREATE POLICY "Members can view own assigned projects"
ON public.freelance_projects
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT fa.project_id
    FROM public.freelance_assignments fa
    JOIN public.profiles p ON p.id = fa.member_id
    WHERE p.user_id = auth.uid()
  )
);

-- Allow members to view freelance_projects they are listed as artist on (via client_project_artists by name)
CREATE POLICY "Members can view projects via client_project_artists"
ON public.freelance_projects
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT cpa.project_id
    FROM public.client_project_artists cpa
    WHERE cpa.artist_name IN (
      SELECT p.full_name FROM public.profiles p WHERE p.user_id = auth.uid()
      UNION
      SELECT p.full_name_en FROM public.profiles p WHERE p.user_id = auth.uid() AND p.full_name_en IS NOT NULL
    )
  )
);
