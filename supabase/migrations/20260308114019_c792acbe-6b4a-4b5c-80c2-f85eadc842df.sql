
-- Notices table
CREATE TABLE public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notices" ON public.notices FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can view notices" ON public.notices FOR SELECT TO authenticated USING (true);

-- Notice comments table
CREATE TABLE public.notice_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id uuid NOT NULL REFERENCES public.notices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_id uuid REFERENCES public.notice_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notice_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all comments" ON public.notice_comments FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can view comments" ON public.notice_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own comments" ON public.notice_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Trigger for updated_at on notices
CREATE TRIGGER update_notices_updated_at BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notification trigger when notice is created
CREATE OR REPLACE FUNCTION public.on_notice_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM notify_all_members(
    'notice',
    'নোটিশ: ' || NEW.title,
    LEFT(NEW.content, 100),
    '/dashboard'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notice_notify AFTER INSERT ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.on_notice_created();
