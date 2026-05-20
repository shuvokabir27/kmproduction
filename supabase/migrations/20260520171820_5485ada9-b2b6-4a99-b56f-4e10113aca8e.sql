
-- Permissions table
CREATE TABLE IF NOT EXISTS public.member_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission text NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, permission)
);

ALTER TABLE public.member_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage member_permissions"
  ON public.member_permissions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members view own permissions"
  ON public.member_permissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = member_permissions.member_id AND p.user_id = auth.uid()));

-- Helper function
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.member_permissions mp
    JOIN public.profiles p ON p.id = mp.member_id
    WHERE p.user_id = _user_id AND mp.permission = _permission
  );
$$;

-- Extend RLS on shooting_expenses
CREATE POLICY "Permitted members manage shooting expenses"
  ON public.shooting_expenses FOR ALL
  USING (public.has_permission(auth.uid(), 'shooting_expenses'))
  WITH CHECK (public.has_permission(auth.uid(), 'shooting_expenses'));

-- Extend RLS on shootings
CREATE POLICY "Permitted members manage shootings"
  ON public.shootings FOR ALL
  USING (public.has_permission(auth.uid(), 'shootings'))
  WITH CHECK (public.has_permission(auth.uid(), 'shootings'));

-- Extend RLS on attendance
CREATE POLICY "Permitted members manage attendance"
  ON public.attendance FOR ALL
  USING (public.has_permission(auth.uid(), 'attendance'))
  WITH CHECK (public.has_permission(auth.uid(), 'attendance'));
