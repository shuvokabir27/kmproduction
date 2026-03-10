
-- Create expense category enum
CREATE TYPE public.expense_category AS ENUM ('food', 'transport', 'props', 'other');

-- Create shooting_expenses table
CREATE TABLE public.shooting_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shooting_id UUID NOT NULL REFERENCES public.shootings(id) ON DELETE CASCADE,
  category expense_category NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shooting_expenses ENABLE ROW LEVEL SECURITY;

-- Only admins can manage expenses
CREATE POLICY "Admins can manage shooting expenses"
  ON public.shooting_expenses
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
