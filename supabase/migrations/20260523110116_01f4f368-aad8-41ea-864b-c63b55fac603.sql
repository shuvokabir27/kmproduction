CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('member','client')),
  phone TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_scope_phone ON public.password_reset_otps(scope, phone, created_at DESC);
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;
-- No policies = no public access; only service role bypasses RLS.