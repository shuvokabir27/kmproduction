-- Create salary_changes table to track all salary updates
CREATE TYPE public.salary_change_type AS ENUM (
  'amount_increase',
  'amount_decrease',
  'type_change'
);

CREATE TABLE public.salary_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  change_type public.salary_change_type NOT NULL,
  old_salary_type public.salary_type,
  new_salary_type public.salary_type,
  old_amount NUMERIC,
  new_amount NUMERIC,
  diff_amount NUMERIC,
  admin_note TEXT,
  changed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.salary_changes ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage salary changes"
ON public.salary_changes
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Members can view own salary change history
CREATE POLICY "Members can view own salary changes"
ON public.salary_changes
FOR SELECT
TO authenticated
USING (
  member_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Index for fast lookup
CREATE INDEX idx_salary_changes_member ON public.salary_changes(member_id, created_at DESC);

-- Trigger to notify member when salary changes
CREATE OR REPLACE FUNCTION public.on_salary_change_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  title_text TEXT;
  message_text TEXT;
BEGIN
  IF NEW.change_type = 'amount_increase' THEN
    title_text := '🎉 আপনার বেতন বৃদ্ধি পেয়েছে';
    message_text := '৳' || NEW.diff_amount::TEXT || ' বৃদ্ধি — কাজের উন্নতির জন্য অভিনন্দন!';
  ELSIF NEW.change_type = 'amount_decrease' THEN
    title_text := '⚠️ আপনার বেতন কমানো হয়েছে';
    message_text := '৳' || NEW.diff_amount::TEXT || ' কমানো হলো';
  ELSE
    title_text := '🔄 বেতনের ধরন পরিবর্তন';
    message_text := COALESCE(NEW.old_salary_type::TEXT, '-') || ' → ' || COALESCE(NEW.new_salary_type::TEXT, '-');
  END IF;

  PERFORM public.notify_member(
    NEW.member_id,
    'salary_change',
    title_text,
    message_text,
    '/dashboard'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_salary_change_created
AFTER INSERT ON public.salary_changes
FOR EACH ROW
EXECUTE FUNCTION public.on_salary_change_created();