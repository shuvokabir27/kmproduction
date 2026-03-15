ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_date date;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_days integer DEFAULT 1;