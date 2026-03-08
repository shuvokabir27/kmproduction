
CREATE OR REPLACE FUNCTION public.on_notice_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM notify_all_members(
    'notice',
    'নোটিশ: ' || NEW.title,
    LEFT(NEW.content, 100),
    '/dashboard?notice=' || NEW.id::text
  );
  RETURN NEW;
END;
$$;
