
-- Add call_time to shootings
ALTER TABLE public.shootings ADD COLUMN call_time text;

-- Add costume and props to shooting_participants
ALTER TABLE public.shooting_participants ADD COLUMN costume text;
ALTER TABLE public.shooting_participants ADD COLUMN props text;
