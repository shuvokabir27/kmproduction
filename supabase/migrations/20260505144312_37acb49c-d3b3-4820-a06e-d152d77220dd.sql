CREATE OR REPLACE FUNCTION public.next_order_number()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nextval('orders_order_number_seq')::integer;
$$;
GRANT EXECUTE ON FUNCTION public.next_order_number() TO anon, authenticated;