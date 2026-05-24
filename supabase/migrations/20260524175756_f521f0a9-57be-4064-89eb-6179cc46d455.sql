
-- ============================================================
-- 1) Receipts bucket -> private, admin-only path policies
-- ============================================================
UPDATE storage.buckets SET public = false WHERE id = 'receipts';

DROP POLICY IF EXISTS "Public can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update receipts" ON storage.objects;

CREATE POLICY "Admins can read receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'receipts' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update receipts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'receipts' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'receipts' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'receipts' AND public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 2) Freelance share-token: remove broad public SELECTs,
--    expose only safe columns via SECURITY DEFINER RPCs.
-- ============================================================
DROP POLICY IF EXISTS "Public can view projects by share_token" ON public.freelance_projects;
DROP POLICY IF EXISTS "Public can view assignments of shared projects" ON public.freelance_assignments;
DROP POLICY IF EXISTS "Public can view scenes of shared projects" ON public.freelance_scenes;

-- Safe project view by token (no phone, no budget, no expense, no notes)
CREATE OR REPLACE FUNCTION public.get_shared_freelance_project(_token text)
RETURNS TABLE (
  id uuid,
  name text,
  client_name text,
  status text,
  project_date date,
  location text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fp.id, fp.name, fp.client_name, fp.status::text, fp.project_date, fp.location
  FROM public.freelance_projects fp
  WHERE _token IS NOT NULL
    AND length(_token) >= 8
    AND fp.share_token = _token;
$$;

-- Safe assignments view (member name + role only, no rate / paid info)
CREATE OR REPLACE FUNCTION public.get_shared_freelance_assignments(_token text)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  role_label text,
  member_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fa.id, fa.project_id, fa.role_label, p.full_name
  FROM public.freelance_assignments fa
  JOIN public.freelance_projects fp ON fp.id = fa.project_id
  LEFT JOIN public.profiles p ON p.id = fa.member_id
  WHERE _token IS NOT NULL
    AND length(_token) >= 8
    AND fp.share_token = _token;
$$;

-- Safe scenes view (lineup only)
CREATE OR REPLACE FUNCTION public.get_shared_freelance_scenes(_token text)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  scene_number text,
  description text,
  location text,
  characters text,
  sort_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fs.id, fs.project_id, fs.scene_number, fs.description, fs.location, fs.characters, fs.sort_order
  FROM public.freelance_scenes fs
  JOIN public.freelance_projects fp ON fp.id = fs.project_id
  WHERE _token IS NOT NULL
    AND length(_token) >= 8
    AND fp.share_token = _token
  ORDER BY fs.sort_order;
$$;

-- Restrict execution to anon + authenticated (these are designed to be public via token)
REVOKE ALL ON FUNCTION public.get_shared_freelance_project(text) FROM public;
REVOKE ALL ON FUNCTION public.get_shared_freelance_assignments(text) FROM public;
REVOKE ALL ON FUNCTION public.get_shared_freelance_scenes(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_shared_freelance_project(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_freelance_assignments(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_freelance_scenes(text) TO anon, authenticated;
