
CREATE TABLE public.bkash_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_name TEXT NOT NULL,
  account_label TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bkash_balances ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view
CREATE POLICY "Authenticated users can view bkash balances"
ON public.bkash_balances FOR SELECT
TO authenticated
USING (true);

-- Only admins can update
CREATE POLICY "Admins can update bkash balances"
ON public.bkash_balances FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert bkash balances"
ON public.bkash_balances FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed the two accounts
INSERT INTO public.bkash_balances (account_name, account_label, balance)
VALUES 
  ('km', 'KM', 0),
  ('saddam', 'সাদ্দাম', 0);
