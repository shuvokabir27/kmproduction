
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE s text;
BEGIN
  s := lower(coalesce(input, ''));
  s := regexp_replace(s, '[\s/?#&=+%\\<>"''`,;:!@$^*()\[\]{}|.]+', '-', 'g');
  s := regexp_replace(s, '-+', '-', 'g');
  s := trim(both '-' from s);
  RETURN s;
END $$;

CREATE OR REPLACE FUNCTION public.generate_unique_product_slug(input text, exclude_id uuid DEFAULT NULL)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
BEGIN
  base := public.slugify(input);
  IF base IS NULL OR base = '' THEN
    base := 'product';
  END IF;
  candidate := base;
  WHILE EXISTS (
    SELECT 1 FROM public.products
    WHERE slug = candidate AND (exclude_id IS NULL OR id <> exclude_id)
  ) LOOP
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;
  RETURN candidate;
END $$;

-- Backfill existing rows
UPDATE public.products SET slug = public.generate_unique_product_slug(name, id)
WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique_idx ON public.products (slug);

CREATE OR REPLACE FUNCTION public.products_set_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.slug IS NULL OR trim(NEW.slug) = '' THEN
    NEW.slug := public.generate_unique_product_slug(NEW.name, NEW.id);
  ELSE
    NEW.slug := public.slugify(NEW.slug);
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
      NEW.slug := public.generate_unique_product_slug(NEW.name, NEW.id);
    ELSIF EXISTS (SELECT 1 FROM public.products WHERE slug = NEW.slug AND id <> NEW.id) THEN
      NEW.slug := public.generate_unique_product_slug(NEW.slug, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_products_set_slug ON public.products;
CREATE TRIGGER trg_products_set_slug
BEFORE INSERT OR UPDATE OF slug, name ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_set_slug();
