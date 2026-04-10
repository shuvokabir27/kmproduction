
-- Add paid_amount column to client_project_expenses for partial payment tracking
ALTER TABLE public.client_project_expenses
ADD COLUMN paid_amount numeric NOT NULL DEFAULT 0;

-- Backfill: set paid_amount = amount for already paid expenses
UPDATE public.client_project_expenses
SET paid_amount = amount
WHERE is_paid = true;
