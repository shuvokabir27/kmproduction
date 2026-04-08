
-- Create freelance_projects table
CREATE TABLE public.freelance_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  client_name text NOT NULL,
  client_phone text,
  project_date date NOT NULL,
  location text,
  total_budget numeric NOT NULL DEFAULT 0,
  total_expense numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'upcoming',
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.freelance_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage freelance_projects"
ON public.freelance_projects FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create freelance_assignments table
CREATE TABLE public.freelance_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.freelance_projects(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_label text NOT NULL DEFAULT '',
  rate numeric NOT NULL DEFAULT 0,
  is_paid boolean NOT NULL DEFAULT false,
  paid_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.freelance_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage freelance_assignments"
ON public.freelance_assignments FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view own freelance_assignments"
ON public.freelance_assignments FOR SELECT
USING (
  member_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
