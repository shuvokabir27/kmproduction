-- Add is_advance flag to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS is_advance BOOLEAN NOT NULL DEFAULT false;

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_payments_is_advance ON public.payments(is_advance) WHERE is_advance = true;

-- Function: detect if payment is advance based on member's balance at time of payment
CREATE OR REPLACE FUNCTION public.detect_advance_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_earned NUMERIC := 0;
  total_bonus NUMERIC := 0;
  total_salary NUMERIC := 0;
  total_freelance NUMERIC := 0;
  prev_balance NUMERIC := 0;
  total_paid NUMERIC := 0;
  total_freelance_paid NUMERIC := 0;
  available_balance NUMERIC := 0;
  payment_amount NUMERIC;
  advance_part NUMERIC;
  member_uuid UUID;
  exclude_cutoff DATE;
  s_type TEXT;
  s_changed TIMESTAMPTZ;
BEGIN
  -- Skip if explicitly marked already
  IF NEW.is_advance = true THEN
    RETURN NEW;
  END IF;

  member_uuid := NEW.member_id;
  payment_amount := NEW.amount;

  -- Earnings from attendance
  SELECT COALESCE(SUM(daily_rate), 0) INTO total_earned
  FROM public.attendance
  WHERE member_id = member_uuid AND is_present = true;

  -- Bonuses
  SELECT COALESCE(SUM(amount), 0) INTO total_bonus
  FROM public.bonuses
  WHERE member_id = member_uuid;

  -- Salary credits (with cutoff if changed to daily)
  SELECT salary_type::TEXT, salary_type_changed_at, COALESCE(previous_balance, 0)
  INTO s_type, s_changed, prev_balance
  FROM public.profiles WHERE id = member_uuid;

  IF s_type = 'daily' AND s_changed IS NOT NULL THEN
    exclude_cutoff := date_trunc('month', s_changed)::DATE;
    SELECT COALESCE(SUM(amount), 0) INTO total_salary
    FROM public.salary_credits
    WHERE member_id = member_uuid AND credit_month < exclude_cutoff;
  ELSE
    SELECT COALESCE(SUM(amount), 0) INTO total_salary
    FROM public.salary_credits
    WHERE member_id = member_uuid;
  END IF;

  -- Freelance earnings (admin assignments only)
  SELECT COALESCE(SUM(rate), 0), COALESCE(SUM(paid_amount), 0)
  INTO total_freelance, total_freelance_paid
  FROM public.freelance_assignments
  WHERE member_id = member_uuid;

  -- Total previous payments (excluding this one — this is BEFORE INSERT triggers don't see NEW row, but BEFORE insert means not yet inserted)
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM public.payments
  WHERE member_id = member_uuid;

  -- Available balance (what member is owed before this payment)
  available_balance := total_earned + total_bonus + total_salary + total_freelance + prev_balance - total_paid - total_freelance_paid;

  -- If available balance <= 0, the entire payment is advance
  -- If 0 < available_balance < payment_amount, the excess is advance
  IF available_balance <= 0 THEN
    -- Entire payment is advance
    NEW.is_advance := true;
  ELSIF payment_amount > available_balance THEN
    -- Partial: split is not supported in single row, so mark as advance only if MORE than half is advance
    advance_part := payment_amount - available_balance;
    IF advance_part > available_balance THEN
      NEW.is_advance := true;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: auto-detect on payment insert
DROP TRIGGER IF EXISTS trg_detect_advance_payment ON public.payments;
CREATE TRIGGER trg_detect_advance_payment
BEFORE INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.detect_advance_payment();