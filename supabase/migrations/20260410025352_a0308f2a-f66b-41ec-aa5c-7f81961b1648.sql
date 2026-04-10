
CREATE TYPE public.client_expense_category AS ENUM ('food', 'costume', 'transport');

CREATE TABLE public.client_project_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.freelance_projects(id) ON DELETE CASCADE,
  client_profile_id UUID NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  category client_expense_category NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_project_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage own project expenses"
ON public.client_project_expenses
FOR ALL
USING (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()))
WITH CHECK (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all project expenses"
ON public.client_project_expenses
FOR SELECT
USING (has_role(auth.uid(), 'admin'));
