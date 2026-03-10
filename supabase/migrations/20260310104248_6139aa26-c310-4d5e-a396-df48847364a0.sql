-- Drop the constraint and column if partially created, then redo properly
ALTER TABLE public.news DROP COLUMN IF EXISTS post_number;
ALTER TABLE public.news DROP COLUMN IF EXISTS slug;
DROP SEQUENCE IF EXISTS news_post_number_seq;

-- Create sequence
CREATE SEQUENCE news_post_number_seq START WITH 1;

-- Add column WITHOUT default first (no unique constraint yet)
ALTER TABLE public.news ADD COLUMN post_number integer;
ALTER TABLE public.news ADD COLUMN slug text;

-- Backfill existing rows
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM public.news
)
UPDATE public.news SET post_number = numbered.rn
FROM numbered WHERE public.news.id = numbered.id;

-- Set sequence to next value after max
SELECT setval('news_post_number_seq', COALESCE((SELECT MAX(post_number) FROM public.news), 0) + 1);

-- Now add unique constraint and default
ALTER TABLE public.news ALTER COLUMN post_number SET DEFAULT nextval('news_post_number_seq');
ALTER TABLE public.news ADD CONSTRAINT news_post_number_key UNIQUE (post_number);