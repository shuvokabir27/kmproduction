-- Public comments table for birthday wishes (no login required)
CREATE TABLE public.birthday_wishes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wisher_name TEXT NOT NULL,
  message TEXT NOT NULL,
  birthday_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_birthday_wishes_member ON public.birthday_wishes(member_id, birthday_date DESC);
CREATE INDEX idx_birthday_wishes_date ON public.birthday_wishes(birthday_date DESC);

ALTER TABLE public.birthday_wishes ENABLE ROW LEVEL SECURITY;

-- Public can view all wishes
CREATE POLICY "Birthday wishes viewable by everyone"
  ON public.birthday_wishes FOR SELECT
  TO anon, authenticated
  USING (true);

-- Anyone (anon included) can post a wish, with input length validation
CREATE POLICY "Anyone can post a birthday wish"
  ON public.birthday_wishes FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    wisher_name IS NOT NULL
    AND length(trim(wisher_name)) BETWEEN 1 AND 60
    AND message IS NOT NULL
    AND length(trim(message)) BETWEEN 1 AND 500
  );

-- Only admins can delete (moderation)
CREATE POLICY "Admins can delete birthday wishes"
  ON public.birthday_wishes FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));