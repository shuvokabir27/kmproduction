-- Add client_profile_id to freelance_payments
ALTER TABLE public.freelance_payments
ADD COLUMN client_profile_id uuid REFERENCES public.client_profiles(id) ON DELETE SET NULL;

-- Make project_id nullable
ALTER TABLE public.freelance_payments
ALTER COLUMN project_id DROP NOT NULL;

-- Add RLS policy for clients to view their own payments
CREATE POLICY "Clients can view own payments"
ON public.freelance_payments
FOR SELECT
TO authenticated
USING (
  client_profile_id IN (
    SELECT id FROM public.client_profiles WHERE user_id = auth.uid()
  )
);