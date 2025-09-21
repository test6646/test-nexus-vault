-- Update existing data to use only Cash/Digital payment methods
-- Convert UPI, Bank Transfer, Card, Cheque to Digital

UPDATE public.staff_payments 
SET payment_method = 'Digital' 
WHERE payment_method IN ('UPI', 'Bank Transfer', 'Card', 'Cheque');

UPDATE public.payments 
SET payment_method = 'Digital' 
WHERE payment_method IN ('UPI', 'Bank Transfer', 'Card', 'Cheque');

UPDATE public.expenses 
SET payment_method = 'Digital' 
WHERE payment_method IN ('UPI', 'Bank Transfer', 'Card', 'Cheque');

UPDATE public.events 
SET advance_payment_method = 'Digital' 
WHERE advance_payment_method IN ('UPI', 'Bank Transfer', 'Card', 'Cheque');

UPDATE public.freelancer_payments 
SET payment_method = 'Digital' 
WHERE payment_method IN ('UPI', 'Bank Transfer', 'Card', 'Cheque');