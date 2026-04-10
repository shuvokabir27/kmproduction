
-- Client artists directory (saved names for reuse)
CREATE TABLE public.client_artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id uuid NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_profile_id, name)
);

ALTER TABLE public.client_artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage own artists"
ON public.client_artists
FOR ALL
TO authenticated
USING (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()))
WITH CHECK (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all client artists"
ON public.client_artists
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Client project artists (assignment + billing per project)
CREATE TABLE public.client_project_artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.freelance_projects(id) ON DELETE CASCADE,
  client_profile_id uuid NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  artist_name text NOT NULL,
  remuneration numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  is_paid boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_project_artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage own project artists"
ON public.client_project_artists
FOR ALL
TO authenticated
USING (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()))
WITH CHECK (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all project artists"
ON public.client_project_artists
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
