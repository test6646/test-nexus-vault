
-- Add missing notes column to expenses table
ALTER TABLE public.expenses 
ADD COLUMN notes TEXT;
