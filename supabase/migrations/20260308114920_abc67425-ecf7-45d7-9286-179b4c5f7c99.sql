
CREATE OR REPLACE FUNCTION public.on_notice_comment_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  notice_title text;
  commenter_name text;
BEGIN
  SELECT title INTO notice_title FROM public.notices WHERE id = NEW.notice_id;
  SELECT full_name INTO commenter_name FROM public.profiles WHERE user_id = NEW.user_id;

  PERFORM notify_all_members(
    'notice',
    COALESCE(commenter_name, 'সদস্য') || ' মন্তব্য করেছেন',
    'নোটিশ: ' || COALESCE(notice_title, ''),
    '/dashboard?notice=' || NEW.notice_id::text
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notice_comment_notify
  AFTER INSERT ON public.notice_comments
  FOR EACH ROW EXECUTE FUNCTION public.on_notice_comment_created();
