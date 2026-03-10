
-- Update the policy to also allow viewing calltime shootings
DROP POLICY IF EXISTS "Members can view ongoing shootings" ON public.shootings;
CREATE POLICY "Members can view ongoing or calltime shootings"
ON public.shootings
FOR SELECT
TO authenticated
USING (status IN ('ongoing', 'calltime'));
