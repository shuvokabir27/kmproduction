
-- Remove old public SELECT policy
DROP POLICY IF EXISTS "Shootings are viewable by everyone" ON public.shootings;

-- Members can only see shootings they have attendance for
CREATE POLICY "Members can view attended shootings"
  ON public.shootings FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR
    id IN (
      SELECT a.shooting_id FROM public.attendance a
      JOIN public.profiles p ON a.member_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );
