
-- Table to track advance deductions from earnings
CREATE TABLE public.advance_deductions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advance_request_id UUID NOT NULL REFERENCES public.advance_requests(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  attendance_id UUID REFERENCES public.attendance(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.advance_deductions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage all advance deductions"
ON public.advance_deductions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view own advance deductions"
ON public.advance_deductions FOR SELECT
USING (member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_advance_deductions_member ON public.advance_deductions(member_id);
CREATE INDEX idx_advance_deductions_request ON public.advance_deductions(advance_request_id);

-- Function: auto-deduct advance when attendance is added
CREATE OR REPLACE FUNCTION public.auto_deduct_advance_on_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  adv RECORD;
  remaining NUMERIC;
  deducted NUMERIC;
  earning NUMERIC;
  left_to_deduct NUMERIC;
BEGIN
  -- Only process if member is present and has a daily rate
  IF NEW.is_present = true AND COALESCE(NEW.daily_rate, 0) > 0 THEN
    earning := NEW.daily_rate;
    left_to_deduct := earning;

    -- Loop through approved advances with remaining balance (oldest first)
    FOR adv IN
      SELECT ar.id, ar.member_id, COALESCE(ar.approved_amount, ar.amount) as total_amount
      FROM public.advance_requests ar
      WHERE ar.member_id = NEW.member_id
        AND ar.status = 'approved'
      ORDER BY ar.created_at ASC
    LOOP
      -- Calculate already deducted for this advance
      SELECT COALESCE(SUM(ad.amount), 0) INTO deducted
      FROM public.advance_deductions ad
      WHERE ad.advance_request_id = adv.id;

      remaining := adv.total_amount - deducted;

      IF remaining > 0 AND left_to_deduct > 0 THEN
        -- Deduct the minimum of remaining advance and available earning
        IF remaining <= left_to_deduct THEN
          INSERT INTO public.advance_deductions (advance_request_id, member_id, attendance_id, amount, notes)
          VALUES (adv.id, NEW.member_id, NEW.id, remaining, 'হাজিরা থেকে অটো কাটা');
          left_to_deduct := left_to_deduct - remaining;
        ELSE
          INSERT INTO public.advance_deductions (advance_request_id, member_id, attendance_id, amount, notes)
          VALUES (adv.id, NEW.member_id, NEW.id, left_to_deduct, 'হাজিরা থেকে অটো কাটা');
          left_to_deduct := 0;
        END IF;
      END IF;

      EXIT WHEN left_to_deduct <= 0;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on attendance insert
CREATE TRIGGER trg_auto_deduct_advance
AFTER INSERT ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.auto_deduct_advance_on_attendance();
