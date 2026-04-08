
-- Add 'client' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

-- Create client_profiles table
CREATE TABLE public.client_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  client_id text NOT NULL UNIQUE,
  name text NOT NULL,
  phone text,
  email text,
  company text,
  address text,
  photo_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- Admin can manage all client profiles
CREATE POLICY "Admins can manage client_profiles"
ON public.client_profiles
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Clients can view own profile
CREATE POLICY "Clients can view own profile"
ON public.client_profiles
FOR SELECT
USING (user_id = auth.uid());

-- Add client_profile_id to freelance_projects
ALTER TABLE public.freelance_projects
ADD COLUMN IF NOT EXISTS client_profile_id uuid REFERENCES public.client_profiles(id);

-- Clients can view their own projects
CREATE POLICY "Clients can view own projects"
ON public.freelance_projects
FOR SELECT
TO authenticated
USING (
  client_profile_id IN (
    SELECT id FROM public.client_profiles WHERE user_id = auth.uid()
  )
);

-- Clients can view assignments of their own projects
CREATE POLICY "Clients can view assignments of own projects"
ON public.freelance_assignments
FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT fp.id FROM public.freelance_projects fp
    JOIN public.client_profiles cp ON fp.client_profile_id = cp.id
    WHERE cp.user_id = auth.uid()
  )
);

-- Clients can view scenes of their own projects
CREATE POLICY "Clients can view scenes of own projects"
ON public.freelance_scenes
FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT fp.id FROM public.freelance_projects fp
    JOIN public.client_profiles cp ON fp.client_profile_id = cp.id
    WHERE cp.user_id = auth.uid()
  )
);
