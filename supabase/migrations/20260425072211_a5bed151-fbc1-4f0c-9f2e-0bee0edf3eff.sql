-- Reclassify existing over-payments as advances
-- For each member, walk through payments oldest to newest;
-- once cumulative payments exceed cumulative earnings (attendance + bonus + salary + previous + freelance assignments rate),
-- mark the excess payments as is_advance=true

DO $$
DECLARE
  m RECORD;
  pay RECORD;
  member_earned NUMERIC;
  member_bonus NUMERIC;
  member_salary NUMERIC;
  member_freelance NUMERIC;
  member_prev NUMERIC;
  member_total_earn NUMERIC;
  cumulative_paid NUMERIC;
  s_type TEXT;
  s_changed TIMESTAMPTZ;
  cutoff DATE;
BEGIN
  FOR m IN SELECT DISTINCT member_id FROM public.payments LOOP
    -- Calculate total earnings for this member
    SELECT COALESCE(SUM(daily_rate),0) INTO member_earned
    FROM public.attendance WHERE member_id = m.member_id AND is_present = true;

    SELECT COALESCE(SUM(amount),0) INTO member_bonus
    FROM public.bonuses WHERE member_id = m.member_id;

    SELECT salary_type::TEXT, salary_type_changed_at, COALESCE(previous_balance,0)
    INTO s_type, s_changed, member_prev
    FROM public.profiles WHERE id = m.member_id;

    IF s_type = 'daily' AND s_changed IS NOT NULL THEN
      cutoff := date_trunc('month', s_changed)::DATE;
      SELECT COALESCE(SUM(amount),0) INTO member_salary
      FROM public.salary_credits
      WHERE member_id = m.member_id AND credit_month < cutoff;
    ELSE
      SELECT COALESCE(SUM(amount),0) INTO member_salary
      FROM public.salary_credits WHERE member_id = m.member_id;
    END IF;

    SELECT COALESCE(SUM(rate),0) - COALESCE(SUM(paid_amount),0) INTO member_freelance
    FROM public.freelance_assignments WHERE member_id = m.member_id;
    member_freelance := COALESCE(member_freelance, 0);

    member_total_earn := member_earned + member_bonus + member_salary + COALESCE(member_prev,0) + member_freelance;

    -- Reset all payments to non-advance first, then mark excess
    UPDATE public.payments SET is_advance = false WHERE member_id = m.member_id;

    cumulative_paid := 0;
    FOR pay IN
      SELECT id, amount FROM public.payments
      WHERE member_id = m.member_id
      ORDER BY payment_date ASC, created_at ASC
    LOOP
      cumulative_paid := cumulative_paid + pay.amount;
      IF cumulative_paid > member_total_earn THEN
        -- This payment pushed us over earnings — mark as advance
        UPDATE public.payments SET is_advance = true WHERE id = pay.id;
      END IF;
    END LOOP;
  END LOOP;
END $$;