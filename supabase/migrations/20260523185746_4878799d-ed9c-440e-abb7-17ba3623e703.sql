
CREATE TABLE IF NOT EXISTS public.admin_phone_logins (
  phone text PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_phone_logins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage admin phone logins"
ON public.admin_phone_logins
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.admin_phone_logins (phone, user_id)
VALUES ('01713953527', '947ef58f-2d52-4d2e-8c21-e28efdf9e364')
ON CONFLICT (phone) DO UPDATE SET user_id = EXCLUDED.user_id;
