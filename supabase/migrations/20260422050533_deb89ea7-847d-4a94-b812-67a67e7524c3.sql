CREATE OR REPLACE FUNCTION public.enforce_advance_request_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  today_count INT;
  last_rejected_at TIMESTAMPTZ;
  minutes_since_reject INT;
BEGIN
  -- Count requests created today by this member (excluding admin-cancelled by member is ok to count)
  SELECT COUNT(*) INTO today_count
  FROM public.advance_requests
  WHERE member_id = NEW.member_id
    AND created_at >= date_trunc('day', now());

  IF today_count >= 3 THEN
    RAISE EXCEPTION 'একদিনে সর্বোচ্চ ৩টি অ্যাডভান্স রিকোয়েস্ট করা যাবে';
  END IF;

  -- Check last rejected request's reviewed_at
  SELECT reviewed_at INTO last_rejected_at
  FROM public.advance_requests
  WHERE member_id = NEW.member_id
    AND status = 'rejected'
  ORDER BY reviewed_at DESC NULLS LAST
  LIMIT 1;

  IF last_rejected_at IS NOT NULL THEN
    minutes_since_reject := EXTRACT(EPOCH FROM (now() - last_rejected_at)) / 60;
    IF minutes_since_reject < 60 THEN
      RAISE EXCEPTION 'বাতিল হওয়ার পর পুনরায় রিকোয়েস্ট করতে আরো % মিনিট অপেক্ষা করুন', (60 - minutes_since_reject);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_advance_request_limits ON public.advance_requests;
CREATE TRIGGER trg_enforce_advance_request_limits
BEFORE INSERT ON public.advance_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_advance_request_limits();