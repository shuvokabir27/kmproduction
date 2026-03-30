
-- Polls table
CREATE TABLE public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Poll options
CREATE TABLE public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Poll votes (one vote per user per poll)
CREATE TABLE public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- RLS
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Polls policies
CREATE POLICY "Admins can manage polls" ON public.polls FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view active polls" ON public.polls FOR SELECT TO authenticated USING (is_active = true);

-- Poll options policies
CREATE POLICY "Admins can manage poll_options" ON public.poll_options FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view poll_options" ON public.poll_options FOR SELECT TO authenticated USING (true);

-- Poll votes policies
CREATE POLICY "Admins can manage poll_votes" ON public.poll_votes FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own vote" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Authenticated can view poll_votes" ON public.poll_votes FOR SELECT TO authenticated USING (true);
