-- Fix on_notice_created to exclude the creator
CREATE OR REPLACE FUNCTION public.on_notice_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT p.user_id, 'notice',
    'নোটিশ: ' || NEW.title,
    LEFT(NEW.content, 100),
    '/dashboard?notice=' || NEW.id::text
  FROM public.profiles p
  WHERE p.is_active = true
    AND p.user_id != COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid);
  RETURN NEW;
END;
$$;