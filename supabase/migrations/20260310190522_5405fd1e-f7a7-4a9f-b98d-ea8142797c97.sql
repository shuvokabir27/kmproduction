
-- Table to store which members are participating in a shooting
CREATE TABLE public.shooting_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shooting_id uuid NOT NULL REFERENCES public.shootings(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shooting_id, member_id)
);

ALTER TABLE public.shooting_participants ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage shooting_participants"
ON public.shooting_participants
FOR ALL
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Members can view their own participation
CREATE POLICY "Members can view own participation"
ON public.shooting_participants
FOR SELECT
TO authenticated
USING (
  member_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);
