
CREATE OR REPLACE FUNCTION public.on_notice_comment_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  notice_title text;
  commenter_name text;
BEGIN
  SELECT title INTO notice_title FROM public.notices WHERE id = NEW.notice_id;
  SELECT full_name INTO commenter_name FROM public.profiles WHERE user_id = NEW.user_id;

  -- Notify all active members EXCEPT the commenter
  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT p.user_id, 'notice',
    COALESCE(commenter_name, 'সদস্য') || ' মন্তব্য করেছেন',
    'নোটিশ: ' || COALESCE(notice_title, ''),
    '/dashboard?notice=' || NEW.notice_id::text
  FROM public.profiles p
  WHERE p.is_active = true
    AND p.user_id != NEW.user_id;

  RETURN NEW;
END;
$$;
