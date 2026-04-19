
-- Sync existing freelance_projects.client_name with current client_profiles.name
UPDATE public.freelance_projects fp
SET client_name = cp.name
FROM public.client_profiles cp
WHERE fp.client_profile_id = cp.id
  AND fp.client_name IS DISTINCT FROM cp.name;

-- Trigger: when a client_profile name changes, update all linked projects
CREATE OR REPLACE FUNCTION public.sync_freelance_projects_client_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.freelance_projects
    SET client_name = NEW.name
    WHERE client_profile_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_freelance_client_name ON public.client_profiles;
CREATE TRIGGER trg_sync_freelance_client_name
AFTER UPDATE ON public.client_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_freelance_projects_client_name();
