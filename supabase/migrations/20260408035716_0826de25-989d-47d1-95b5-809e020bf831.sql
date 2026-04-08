
CREATE TABLE public.freelance_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.freelance_projects(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  payment_date timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  paid_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.freelance_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage freelance_payments"
ON public.freelance_payments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view own project payments"
ON public.freelance_payments FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT fp.id FROM freelance_projects fp
    JOIN client_profiles cp ON fp.client_profile_id = cp.id
    WHERE cp.user_id = auth.uid()
  )
);
