ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bank_account_holder text,
ADD COLUMN IF NOT EXISTS bkash_holder text,
ADD COLUMN IF NOT EXISTS nagad_holder text;