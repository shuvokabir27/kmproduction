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
  rows_updated INT;
BEGIN
  -- First reset all
  UPDATE public.payments SET is_advance = false;

  FOR m IN SELECT DISTINCT member_id FROM public.payments LOOP
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

    SELECT GREATEST(COALESCE(SUM(rate),0) - COALESCE(SUM(paid_amount),0), 0) INTO member_freelance
    FROM public.freelance_assignments WHERE member_id = m.member_id;

    member_total_earn := COALESCE(member_earned,0) + COALESCE(member_bonus,0) + COALESCE(member_salary,0) + COALESCE(member_prev,0) + COALESCE(member_freelance,0);

    cumulative_paid := 0;
    FOR pay IN
      SELECT id, amount FROM public.payments
      WHERE member_id = m.member_id
      ORDER BY payment_date ASC, created_at ASC
    LOOP
      cumulative_paid := cumulative_paid + COALESCE(pay.amount, 0);
      IF cumulative_paid > member_total_earn THEN
        UPDATE public.payments SET is_advance = true WHERE id = pay.id;
        GET DIAGNOSTICS rows_updated = ROW_COUNT;
        RAISE NOTICE 'Member %, payment % (amount %), cumulative %, earn %, updated rows %',
          m.member_id, pay.id, pay.amount, cumulative_paid, member_total_earn, rows_updated;
      END IF;
    END LOOP;
  END LOOP;
END $$;