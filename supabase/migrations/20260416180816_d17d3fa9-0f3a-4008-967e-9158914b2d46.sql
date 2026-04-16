ALTER TABLE public.popular_videos 
ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT 'home';

CREATE INDEX IF NOT EXISTS idx_popular_videos_location ON public.popular_videos(location);