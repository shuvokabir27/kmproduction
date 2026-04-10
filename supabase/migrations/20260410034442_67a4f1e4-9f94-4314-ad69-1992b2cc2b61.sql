
-- Create payment type enum
CREATE TYPE public.client_payment_type AS ENUM ('artist', 'expense');

-- Create client payment history table
CREATE TABLE public.client_payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_profile_id UUID NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  payment_type public.client_payment_type NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_payment_history ENABLE ROW LEVEL SECURITY;

-- Clients can view/insert/delete own payment history
CREATE POLICY "Clients can view own payment history"
ON public.client_payment_history
FOR SELECT
USING (client_profile_id IN (
  SELECT id FROM public.client_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Clients can insert own payment history"
ON public.client_payment_history
FOR INSERT
WITH CHECK (client_profile_id IN (
  SELECT id FROM public.client_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Clients can delete own payment history"
ON public.client_payment_history
FOR DELETE
USING (client_profile_id IN (
  SELECT id FROM public.client_profiles WHERE user_id = auth.uid()
));

-- Admins can do everything
CREATE POLICY "Admins can manage all payment history"
ON public.client_payment_history
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
