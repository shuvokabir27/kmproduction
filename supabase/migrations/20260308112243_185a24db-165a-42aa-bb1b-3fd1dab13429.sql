
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view/update their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Admins can manage all
CREATE POLICY "Admins can manage notifications"
  ON public.notifications FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger function: notify all active members
CREATE OR REPLACE FUNCTION public.notify_all_members(
  _type text,
  _title text,
  _message text DEFAULT NULL,
  _link text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT p.user_id, _type, _title, _message, _link
  FROM public.profiles p
  WHERE p.is_active = true;
END;
$$;

-- Trigger function: notify specific member
CREATE OR REPLACE FUNCTION public.notify_member(
  _member_profile_id uuid,
  _type text,
  _title text,
  _message text DEFAULT NULL,
  _link text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT p.user_id, _type, _title, _message, _link
  FROM public.profiles p
  WHERE p.id = _member_profile_id;
END;
$$;

-- Auto-notify on new shooting
CREATE OR REPLACE FUNCTION public.on_shooting_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notify_all_members(
    'shooting',
    'নতুন শুটিং: ' || NEW.name,
    NEW.location,
    '/dashboard'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shooting_notify
  AFTER INSERT ON public.shootings
  FOR EACH ROW
  EXECUTE FUNCTION public.on_shooting_created();

-- Auto-notify on payment
CREATE OR REPLACE FUNCTION public.on_payment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notify_member(
    NEW.member_id,
    'payment',
    'পেমেন্ট সম্পন্ন: ৳' || NEW.amount::text,
    NULL,
    '/dashboard'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payment_notify
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.on_payment_created();

-- Auto-notify on attendance
CREATE OR REPLACE FUNCTION public.on_attendance_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  shooting_name text;
BEGIN
  SELECT name INTO shooting_name FROM public.shootings WHERE id = NEW.shooting_id;
  IF NEW.is_present THEN
    PERFORM notify_member(
      NEW.member_id,
      'attendance',
      'হাজিরা রেকর্ড: ' || COALESCE(shooting_name, 'শুটিং'),
      CASE WHEN NEW.daily_rate > 0 THEN '৳' || NEW.daily_rate::text ELSE NULL END,
      '/dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attendance_notify
  AFTER INSERT ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.on_attendance_created();

-- Auto-notify on script permission
CREATE OR REPLACE FUNCTION public.on_script_permission_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  script_title text;
BEGIN
  SELECT title INTO script_title FROM public.scripts WHERE id = NEW.script_id;
  PERFORM notify_member(
    NEW.member_id,
    'script',
    'স্ক্রিপ্ট অ্যাক্সেস: ' || COALESCE(script_title, 'স্ক্রিপ্ট'),
    NULL,
    '/dashboard'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_script_permission_notify
  AFTER INSERT ON public.script_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.on_script_permission_created();
