-- Create platform enum
CREATE TYPE public.app_platform AS ENUM ('android', 'ios');

-- Create app_versions table
CREATE TABLE public.app_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  platform app_platform NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  release_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  released_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookup of active version per platform
CREATE INDEX idx_app_versions_platform_active ON public.app_versions(platform, is_active, released_at DESC);

-- Enable RLS
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- Anyone can view active versions (public download page)
CREATE POLICY "Anyone can view active app versions"
ON public.app_versions
FOR SELECT
USING (is_active = true);

-- Admins can view all versions (including inactive/archived)
CREATE POLICY "Admins can view all app versions"
ON public.app_versions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert
CREATE POLICY "Admins can insert app versions"
ON public.app_versions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update
CREATE POLICY "Admins can update app versions"
ON public.app_versions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete app versions"
ON public.app_versions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_app_versions_updated_at
BEFORE UPDATE ON public.app_versions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to deactivate previous versions when a new one is set active
CREATE OR REPLACE FUNCTION public.deactivate_old_app_versions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.app_versions
    SET is_active = false, updated_at = now()
    WHERE platform = NEW.platform
      AND id != NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER deactivate_old_versions_on_insert
AFTER INSERT ON public.app_versions
FOR EACH ROW
EXECUTE FUNCTION public.deactivate_old_app_versions();

CREATE TRIGGER deactivate_old_versions_on_update
AFTER UPDATE OF is_active ON public.app_versions
FOR EACH ROW
WHEN (NEW.is_active = true AND OLD.is_active = false)
EXECUTE FUNCTION public.deactivate_old_app_versions();