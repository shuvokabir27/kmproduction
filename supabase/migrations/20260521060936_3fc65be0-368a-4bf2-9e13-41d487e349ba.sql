
CREATE TABLE public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  shop_customer_id UUID NOT NULL REFERENCES public.shop_customers(id) ON DELETE CASCADE,
  customer_name TEXT,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (product_id, shop_customer_id)
);

CREATE INDEX idx_product_reviews_product ON public.product_reviews(product_id);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
ON public.product_reviews FOR SELECT
USING (true);

CREATE POLICY "Admins manage reviews"
ON public.product_reviews FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'product_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'product_admin'::app_role));

CREATE TRIGGER update_product_reviews_updated_at
BEFORE UPDATE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.submit_product_review(
  _token TEXT,
  _product_id UUID,
  _rating SMALLINT,
  _comment TEXT
) RETURNS public.product_reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _customer public.shop_customers%ROWTYPE;
  _has_order BOOLEAN;
  _review public.product_reviews;
BEGIN
  IF _rating < 1 OR _rating > 5 THEN
    RAISE EXCEPTION 'Invalid rating';
  END IF;

  SELECT * INTO _customer FROM public.shop_customers
  WHERE session_token = _token
    AND session_expires_at > now()
    AND is_active = true
  LIMIT 1;

  IF _customer.id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.orders
    WHERE shop_customer_id = _customer.id
      AND product_id = _product_id
  ) INTO _has_order;

  IF NOT _has_order THEN
    RAISE EXCEPTION 'Only customers who purchased this product can review';
  END IF;

  INSERT INTO public.product_reviews (product_id, shop_customer_id, customer_name, rating, comment)
  VALUES (_product_id, _customer.id, _customer.full_name, _rating, NULLIF(trim(_comment), ''))
  ON CONFLICT (product_id, shop_customer_id) DO UPDATE
    SET rating = EXCLUDED.rating,
        comment = EXCLUDED.comment,
        customer_name = EXCLUDED.customer_name,
        updated_at = now()
  RETURNING * INTO _review;

  RETURN _review;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_product_review(TEXT, UUID, SMALLINT, TEXT) TO anon, authenticated;
