-- Marquee/announcement settings (singleton row) editable by admins, readable by everyone
CREATE TABLE IF NOT EXISTS public.marquee_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.marquee_settings ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated public viewers) can read the marquee text
CREATE POLICY "Marquee readable by everyone"
ON public.marquee_settings
FOR SELECT
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert marquee"
ON public.marquee_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update marquee"
ON public.marquee_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete marquee"
ON public.marquee_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_marquee_settings_updated_at
BEFORE UPDATE ON public.marquee_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a default singleton row
INSERT INTO public.marquee_settings (text, is_enabled)
VALUES ('এখানে কুয়াকাটা মাল্টিমিডিয়া-র সকল কাজের আপডেট পাবেন।', true);

-- Realtime so all dashboards update instantly when admin saves
ALTER PUBLICATION supabase_realtime ADD TABLE public.marquee_settings;