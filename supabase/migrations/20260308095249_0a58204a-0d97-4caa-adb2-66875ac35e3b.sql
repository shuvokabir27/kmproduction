ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS favorite_actor_en text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS favorite_actress_en text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS favorite_color_en text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS favorite_dress_en text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS favorite_food_en text DEFAULT NULL;