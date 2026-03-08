
CREATE TABLE public.service_offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL DEFAULT 'বিশেষ অফার',
  description text,
  discount_percentage numeric NOT NULL DEFAULT 0,
  offer_end_date timestamp with time zone NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.service_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage service_offers"
ON public.service_offers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view active service_offers"
ON public.service_offers
FOR SELECT
TO anon, authenticated
USING (is_active = true);
