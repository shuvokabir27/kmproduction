-- Add 'returned' to order_status enum
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'returned';

-- Add return tracking columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS returned_at timestamptz DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_amount numeric DEFAULT 0;