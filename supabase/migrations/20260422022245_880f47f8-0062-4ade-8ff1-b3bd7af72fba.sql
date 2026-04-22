CREATE TABLE public.member_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL,
  badge_type TEXT NOT NULL,
  badge_label TEXT NOT NULL,
  badge_icon TEXT NOT NULL DEFAULT '🏆',
  badge_color TEXT NOT NULL DEFAULT 'amber',
  description TEXT,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, badge_type)
);

ALTER TABLE public.member_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements viewable by everyone"
ON public.member_achievements FOR SELECT USING (true);

CREATE POLICY "Admins can manage achievements"
ON public.member_achievements FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_member_achievements_member ON public.member_achievements(member_id);
CREATE INDEX idx_member_achievements_earned ON public.member_achievements(earned_at DESC);

CREATE OR REPLACE FUNCTION public.grant_member_achievements(_member_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  shooting_count INT;
  joining_years INT;
  joining_dt DATE;
BEGIN
  SELECT COUNT(DISTINCT shooting_id) INTO shooting_count
  FROM public.attendance
  WHERE member_id = _member_id AND is_present = true;

  IF shooting_count >= 10 THEN
    INSERT INTO public.member_achievements (member_id, badge_type, badge_label, badge_icon, badge_color, description)
    VALUES (_member_id, 'shooting_10', '১০ শুটিং', '🎬', 'blue', '১০টি শুটিং সম্পন্ন')
    ON CONFLICT (member_id, badge_type) DO NOTHING;
  END IF;
  IF shooting_count >= 50 THEN
    INSERT INTO public.member_achievements (member_id, badge_type, badge_label, badge_icon, badge_color, description)
    VALUES (_member_id, 'shooting_50', '৫০ শুটিং মাস্টার', '🎥', 'purple', '৫০টি শুটিং সম্পন্ন')
    ON CONFLICT (member_id, badge_type) DO NOTHING;
  END IF;
  IF shooting_count >= 100 THEN
    INSERT INTO public.member_achievements (member_id, badge_type, badge_label, badge_icon, badge_color, description)
    VALUES (_member_id, 'shooting_100', '১০০ শুটিং কিংবদন্তি', '🏆', 'amber', '১০০টি শুটিং সম্পন্ন')
    ON CONFLICT (member_id, badge_type) DO NOTHING;
  END IF;
  IF shooting_count >= 500 THEN
    INSERT INTO public.member_achievements (member_id, badge_type, badge_label, badge_icon, badge_color, description)
    VALUES (_member_id, 'shooting_500', '৫০০ শুটিং সম্রাট', '👑', 'rose', '৫০০টি শুটিং সম্পন্ন')
    ON CONFLICT (member_id, badge_type) DO NOTHING;
  END IF;

  SELECT joining_date INTO joining_dt FROM public.profiles WHERE id = _member_id;
  IF joining_dt IS NOT NULL THEN
    joining_years := EXTRACT(YEAR FROM age(CURRENT_DATE, joining_dt))::INT;
    IF joining_years >= 1 THEN
      INSERT INTO public.member_achievements (member_id, badge_type, badge_label, badge_icon, badge_color, description)
      VALUES (_member_id, 'anniversary_1y', '১ বছর পূর্তি', '🎉', 'green', '১ বছর সফলভাবে যুক্ত')
      ON CONFLICT (member_id, badge_type) DO NOTHING;
    END IF;
    IF joining_years >= 3 THEN
      INSERT INTO public.member_achievements (member_id, badge_type, badge_label, badge_icon, badge_color, description)
      VALUES (_member_id, 'anniversary_3y', '৩ বছর পূর্তি', '⭐', 'cyan', '৩ বছর সফলভাবে যুক্ত')
      ON CONFLICT (member_id, badge_type) DO NOTHING;
    END IF;
    IF joining_years >= 5 THEN
      INSERT INTO public.member_achievements (member_id, badge_type, badge_label, badge_icon, badge_color, description)
      VALUES (_member_id, 'anniversary_5y', '৫ বছর পূর্তি', '💎', 'indigo', '৫ বছর সফলভাবে যুক্ত')
      ON CONFLICT (member_id, badge_type) DO NOTHING;
    END IF;
    IF joining_years >= 10 THEN
      INSERT INTO public.member_achievements (member_id, badge_type, badge_label, badge_icon, badge_color, description)
      VALUES (_member_id, 'anniversary_10y', '১০ বছর কিংবদন্তি', '🌟', 'amber', '১০ বছর সফলভাবে যুক্ত')
      ON CONFLICT (member_id, badge_type) DO NOTHING;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_all_member_achievements()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m RECORD;
BEGIN
  FOR m IN SELECT id FROM public.profiles WHERE is_active = true LOOP
    PERFORM public.grant_member_achievements(m.id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_birthday_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m RECORD;
  days_until INT;
  next_bday DATE;
BEGIN
  FOR m IN
    SELECT id, full_name, date_of_birth
    FROM public.profiles
    WHERE is_active = true AND date_of_birth IS NOT NULL
  LOOP
    next_bday := to_date(to_char(CURRENT_DATE, 'YYYY') || '-' || to_char(m.date_of_birth, 'MM-DD'), 'YYYY-MM-DD');
    IF next_bday < CURRENT_DATE THEN
      next_bday := to_date((EXTRACT(YEAR FROM CURRENT_DATE)::INT + 1)::TEXT || '-' || to_char(m.date_of_birth, 'MM-DD'), 'YYYY-MM-DD');
    END IF;
    days_until := next_bday - CURRENT_DATE;

    IF days_until = 3 THEN
      INSERT INTO public.notifications (user_id, type, title, message, link)
      SELECT p.user_id, 'birthday',
        '🎂 ৩ দিন পর ' || m.full_name || '-এর জন্মদিন!',
        'শুভেচ্ছা পরিকল্পনা শুরু করুন',
        '/dashboard'
      FROM public.profiles p
      WHERE p.is_active = true AND p.id != m.id;
    END IF;

    IF days_until = 0 THEN
      INSERT INTO public.notifications (user_id, type, title, message, link)
      SELECT p.user_id, 'birthday',
        '🎉 আজ ' || m.full_name || '-এর জন্মদিন!',
        'শুভেচ্ছা জানান',
        '/dashboard'
      FROM public.profiles p
      WHERE p.is_active = true AND p.id != m.id;

      INSERT INTO public.member_achievements (member_id, badge_type, badge_label, badge_icon, badge_color, description, metadata)
      VALUES (m.id, 'birthday_' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT,
              'জন্মদিন ' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT,
              '🎂', 'pink', 'শুভ জন্মদিন!',
              jsonb_build_object('year', EXTRACT(YEAR FROM CURRENT_DATE)))
      ON CONFLICT (member_id, badge_type) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

SELECT public.grant_all_member_achievements();