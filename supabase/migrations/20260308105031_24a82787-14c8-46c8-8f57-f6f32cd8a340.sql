
CREATE TABLE public.script_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(script_id, member_id)
);

ALTER TABLE public.script_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage permissions
CREATE POLICY "Admins can manage script_permissions"
  ON public.script_permissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Members can view their own permissions
CREATE POLICY "Members can view own script_permissions"
  ON public.script_permissions FOR SELECT
  USING (member_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Update scripts RLS: members with permission can view scripts
DROP POLICY IF EXISTS "Admins can manage scripts" ON public.scripts;

CREATE POLICY "Admins can manage scripts"
  ON public.scripts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Permitted members can view scripts"
  ON public.scripts FOR SELECT
  USING (
    id IN (
      SELECT sp.script_id FROM public.script_permissions sp
      JOIN public.profiles p ON sp.member_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );
