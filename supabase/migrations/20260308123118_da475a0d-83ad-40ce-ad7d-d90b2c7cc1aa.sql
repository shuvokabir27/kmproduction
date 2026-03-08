
-- Script comments table
CREATE TABLE public.script_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.script_comments ENABLE ROW LEVEL SECURITY;

-- Authenticated users who have script access can view comments
CREATE POLICY "Users with script access can view comments"
  ON public.script_comments FOR SELECT TO authenticated
  USING (
    script_id IN (
      SELECT sp.script_id FROM script_permissions sp
      JOIN profiles p ON sp.member_id = p.id
      WHERE p.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can insert own comments"
  ON public.script_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all script comments"
  ON public.script_comments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.script_comments;
