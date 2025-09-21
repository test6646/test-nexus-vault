-- Fix payment method constraint and standardize to only Cash/Digital
-- First, let's check what constraint exists and drop it

-- Drop the existing constraint if it exists
ALTER TABLE public.staff_payments DROP CONSTRAINT IF EXISTS staff_payments_payment_method_check;

-- Add new constraint that only allows Cash or Digital
ALTER TABLE public.staff_payments 
ADD CONSTRAINT staff_payments_payment_method_check 
CHECK (payment_method IN ('Cash', 'Digital'));

-- Also update other payment method constraints
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments 
ADD CONSTRAINT payments_payment_method_check 
CHECK (payment_method IN ('Cash', 'Digital'));

ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_payment_method_check;
ALTER TABLE public.expenses 
ADD CONSTRAINT expenses_payment_method_check 
CHECK (payment_method IN ('Cash', 'Digital'));

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_advance_payment_method_check;
ALTER TABLE public.events 
ADD CONSTRAINT events_advance_payment_method_check 
CHECK (advance_payment_method IN ('Cash', 'Digital'));

-- Update freelancer_payments to use text with constraint instead of enum
ALTER TABLE public.freelancer_payments DROP CONSTRAINT IF EXISTS freelancer_payments_payment_method_check;
ALTER TABLE public.freelancer_payments 
ADD CONSTRAINT freelancer_payments_payment_method_check 
CHECK (payment_method IN ('Cash', 'Digital'));