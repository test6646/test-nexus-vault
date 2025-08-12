-- Add payment_method column to expenses table
ALTER TABLE public.expenses 
ADD COLUMN payment_method payment_method NOT NULL DEFAULT 'Cash';

-- Update existing records to have a default payment method
UPDATE public.expenses 
SET payment_method = 'Cash' 
WHERE payment_method IS NULL;