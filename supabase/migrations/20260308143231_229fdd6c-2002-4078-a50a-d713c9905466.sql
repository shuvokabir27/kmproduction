
-- Table to track monthly salary credits
CREATE TABLE public.salary_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  credit_month date NOT NULL, -- first day of the month, e.g. 2026-03-01
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(member_id, credit_month)
);

ALTER TABLE public.salary_credits ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage salary_credits"
  ON public.salary_credits FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Members can view own
CREATE POLICY "Members can view own salary_credits"
  ON public.salary_credits FOR SELECT
  USING (
    member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );
