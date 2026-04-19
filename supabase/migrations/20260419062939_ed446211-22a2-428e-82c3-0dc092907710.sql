-- 1) Add profile_id to client_project_artists for stable linking
ALTER TABLE public.client_project_artists
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_client_project_artists_profile_id
  ON public.client_project_artists(profile_id);

-- 2) Backfill profile_id by matching artist_name to profiles.full_name (or full_name_en)
UPDATE public.client_project_artists cpa
SET profile_id = p.id
FROM public.profiles p
WHERE cpa.profile_id IS NULL
  AND (cpa.artist_name = p.full_name OR cpa.artist_name = p.full_name_en);

-- 3) Trigger: when a profile's name changes, sync artist_name everywhere
CREATE OR REPLACE FUNCTION public.sync_artist_name_on_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    -- Update by profile_id link (most reliable)
    UPDATE public.client_project_artists
    SET artist_name = NEW.full_name
    WHERE profile_id = NEW.id;

    -- Fallback: also update legacy rows that still match by old name and have no profile_id
    UPDATE public.client_project_artists
    SET artist_name = NEW.full_name, profile_id = NEW.id
    WHERE profile_id IS NULL AND artist_name = OLD.full_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_artist_name_on_profile_update ON public.profiles;
CREATE TRIGGER trg_sync_artist_name_on_profile_update
AFTER UPDATE OF full_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_artist_name_on_profile_update();