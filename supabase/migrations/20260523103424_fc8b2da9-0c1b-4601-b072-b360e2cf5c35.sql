CREATE TABLE public.customer_password_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_password_otps_phone ON public.customer_password_otps(phone, created_at DESC);
ALTER TABLE public.customer_password_otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view OTP logs" ON public.customer_password_otps
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));