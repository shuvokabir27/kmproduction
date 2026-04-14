-- Create shooting_scenes table for tracking scene shots during shootings
CREATE TABLE public.shooting_scenes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shooting_id UUID NOT NULL REFERENCES public.shootings(id) ON DELETE CASCADE,
  scene_label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_shot BOOLEAN NOT NULL DEFAULT false,
  shot_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shooting_scenes ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage shooting_scenes"
ON public.shooting_scenes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Members can view scenes of shootings they participate in
CREATE POLICY "Members can view shooting scenes"
ON public.shooting_scenes
FOR SELECT
TO authenticated
USING (
  shooting_id IN (
    SELECT sp.shooting_id FROM public.shooting_participants sp
    JOIN public.profiles p ON sp.member_id = p.id
    WHERE p.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Index for fast lookups
CREATE INDEX idx_shooting_scenes_shooting_id ON public.shooting_scenes(shooting_id);