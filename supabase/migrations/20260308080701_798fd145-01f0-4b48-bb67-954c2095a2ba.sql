
-- Add salary type enum
CREATE TYPE public.salary_type AS ENUM ('daily', 'monthly');

-- Add salary_type and monthly_salary columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN salary_type public.salary_type DEFAULT 'daily',
ADD COLUMN monthly_salary numeric DEFAULT 0;
