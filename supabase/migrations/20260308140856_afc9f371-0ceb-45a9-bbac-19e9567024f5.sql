
-- Create bonus_type enum
CREATE TYPE public.bonus_type AS ENUM ('bonus', 'transport');

-- Create bonuses table
CREATE TABLE public.bonuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.bonus_type NOT NULL,
  amount NUMERIC NOT NULL,
  notes TEXT,
  bonus_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  given_by UUID
);

-- Enable RLS
ALTER TABLE public.bonuses ENABLE ROW LEVEL SECURITY;

-- Admin can manage all bonuses
CREATE POLICY "Admins can manage bonuses"
  ON public.bonuses FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Members can view own bonuses
CREATE POLICY "Members can view own bonuses"
  ON public.bonuses FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );
