
-- Allow clients to insert scenes into their own projects
CREATE POLICY "Clients can insert scenes to own projects"
ON public.freelance_scenes
FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT fp.id FROM freelance_projects fp
    JOIN client_profiles cp ON fp.client_profile_id = cp.id
    WHERE cp.user_id = auth.uid()
  )
);

-- Allow clients to update scenes of their own projects
CREATE POLICY "Clients can update scenes of own projects"
ON public.freelance_scenes
FOR UPDATE
TO authenticated
USING (
  project_id IN (
    SELECT fp.id FROM freelance_projects fp
    JOIN client_profiles cp ON fp.client_profile_id = cp.id
    WHERE cp.user_id = auth.uid()
  )
);

-- Allow clients to delete scenes of their own projects
CREATE POLICY "Clients can delete scenes of own projects"
ON public.freelance_scenes
FOR DELETE
TO authenticated
USING (
  project_id IN (
    SELECT fp.id FROM freelance_projects fp
    JOIN client_profiles cp ON fp.client_profile_id = cp.id
    WHERE cp.user_id = auth.uid()
  )
);
