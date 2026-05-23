
-- Bengali → English transliteration helper
CREATE OR REPLACE FUNCTION public.bn_to_en(input text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE s text;
BEGIN
  s := coalesce(input, '');
  -- Vowels (independent)
  s := replace(s, 'অ', 'o');
  s := replace(s, 'আ', 'a');
  s := replace(s, 'ই', 'i');
  s := replace(s, 'ঈ', 'i');
  s := replace(s, 'উ', 'u');
  s := replace(s, 'ঊ', 'u');
  s := replace(s, 'ঋ', 'ri');
  s := replace(s, 'এ', 'e');
  s := replace(s, 'ঐ', 'oi');
  s := replace(s, 'ও', 'o');
  s := replace(s, 'ঔ', 'ou');
  -- Vowel signs (kar)
  s := replace(s, 'া', 'a');
  s := replace(s, 'ি', 'i');
  s := replace(s, 'ী', 'i');
  s := replace(s, 'ু', 'u');
  s := replace(s, 'ূ', 'u');
  s := replace(s, 'ৃ', 'ri');
  s := replace(s, 'ে', 'e');
  s := replace(s, 'ৈ', 'oi');
  s := replace(s, 'ো', 'o');
  s := replace(s, 'ৌ', 'ou');
  -- Consonants
  s := replace(s, 'ক', 'k');
  s := replace(s, 'খ', 'kh');
  s := replace(s, 'গ', 'g');
  s := replace(s, 'ঘ', 'gh');
  s := replace(s, 'ঙ', 'ng');
  s := replace(s, 'চ', 'ch');
  s := replace(s, 'ছ', 'chh');
  s := replace(s, 'জ', 'j');
  s := replace(s, 'ঝ', 'jh');
  s := replace(s, 'ঞ', 'n');
  s := replace(s, 'ট', 't');
  s := replace(s, 'ঠ', 'th');
  s := replace(s, 'ড', 'd');
  s := replace(s, 'ঢ', 'dh');
  s := replace(s, 'ণ', 'n');
  s := replace(s, 'ত', 't');
  s := replace(s, 'থ', 'th');
  s := replace(s, 'দ', 'd');
  s := replace(s, 'ধ', 'dh');
  s := replace(s, 'ন', 'n');
  s := replace(s, 'প', 'p');
  s := replace(s, 'ফ', 'ph');
  s := replace(s, 'ব', 'b');
  s := replace(s, 'ভ', 'bh');
  s := replace(s, 'ম', 'm');
  s := replace(s, 'য', 'y');
  s := replace(s, 'র', 'r');
  s := replace(s, 'ল', 'l');
  s := replace(s, 'শ', 'sh');
  s := replace(s, 'ষ', 'sh');
  s := replace(s, 'স', 's');
  s := replace(s, 'হ', 'h');
  s := replace(s, 'ড়', 'r');
  s := replace(s, 'ঢ়', 'rh');
  s := replace(s, 'য়', 'y');
  s := replace(s, 'ৎ', 't');
  s := replace(s, 'ং', 'ng');
  s := replace(s, 'ঁ', '');
  s := replace(s, 'ঃ', 'h');
  s := replace(s, '্', '');
  -- Digits
  s := replace(s, '০', '0');
  s := replace(s, '১', '1');
  s := replace(s, '২', '2');
  s := replace(s, '৩', '3');
  s := replace(s, '৪', '4');
  s := replace(s, '৫', '5');
  s := replace(s, '৬', '6');
  s := replace(s, '৭', '7');
  s := replace(s, '৮', '8');
  s := replace(s, '৯', '9');
  RETURN s;
END $$;

-- Update slugify to transliterate Bengali, then strip non-ascii
CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE s text;
BEGIN
  s := lower(public.bn_to_en(coalesce(input, '')));
  -- Replace any non a-z, 0-9 with hyphen
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '-+', '-', 'g');
  s := trim(both '-' from s);
  RETURN s;
END $$;

-- Regenerate slugs for products that contain non-ascii or are empty
UPDATE public.products
SET slug = public.generate_unique_product_slug(name, id)
WHERE slug IS NULL OR slug = '' OR slug ~ '[^a-z0-9-]';
