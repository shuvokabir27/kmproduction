
-- Add share_token to freelance_projects
ALTER TABLE public.freelance_projects
ADD COLUMN IF NOT EXISTS share_token text UNIQUE;

-- Allow public to view freelance_projects by share_token (for client view)
CREATE POLICY "Public can view projects by share_token"
ON public.freelance_projects
FOR SELECT
TO anon, authenticated
USING (share_token IS NOT NULL AND share_token != '');

-- Create freelance_scenes table
CREATE TABLE public.freelance_scenes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.freelance_projects(id) ON DELETE CASCADE,
  scene_number integer NOT NULL DEFAULT 1,
  description text,
  location text,
  characters text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.freelance_scenes ENABLE ROW LEVEL SECURITY;

-- Admins can manage all scenes
CREATE POLICY "Admins can manage freelance_scenes"
ON public.freelance_scenes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can view scenes of shared projects
CREATE POLICY "Public can view scenes of shared projects"
ON public.freelance_scenes
FOR SELECT
TO anon, authenticated
USING (
  project_id IN (
    SELECT id FROM public.freelance_projects
    WHERE share_token IS NOT NULL AND share_token != ''
  )
);

-- Allow public to view freelance_assignments for shared projects
CREATE POLICY "Public can view assignments of shared projects"
ON public.freelance_assignments
FOR SELECT
TO anon, authenticated
USING (
  project_id IN (
    SELECT id FROM public.freelance_projects
    WHERE share_token IS NOT NULL AND share_token != ''
  )
);
