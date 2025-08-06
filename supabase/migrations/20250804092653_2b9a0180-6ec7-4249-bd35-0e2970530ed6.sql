-- Fix RLS policies for staff_payments table
-- Drop existing policies
DROP POLICY IF EXISTS "delete_staff_payments" ON public.staff_payments;
DROP POLICY IF EXISTS "insert_staff_payments" ON public.staff_payments;
DROP POLICY IF EXISTS "select_staff_payments" ON public.staff_payments;
DROP POLICY IF EXISTS "update_staff_payments" ON public.staff_payments;

-- Create corrected policies using user_id instead of id
CREATE POLICY "select_staff_payments" 
ON public.staff_payments 
FOR SELECT 
USING (firm_id IN ( 
  SELECT profiles.firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "insert_staff_payments" 
ON public.staff_payments 
FOR INSERT 
WITH CHECK (firm_id IN ( 
  SELECT profiles.firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "update_staff_payments" 
ON public.staff_payments 
FOR UPDATE 
USING (firm_id IN ( 
  SELECT profiles.firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "delete_staff_payments" 
ON public.staff_payments 
FOR DELETE 
USING (firm_id IN ( 
  SELECT profiles.firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));