-- Fix the staff_payments RLS policies to ensure proper firm access
-- The issue is that the current RLS policy uses get_current_user_current_firm_id() 
-- but the insert should work when firm_id matches the user's current firm

-- Drop existing policies
DROP POLICY IF EXISTS "select_staff_payments" ON public.staff_payments;
DROP POLICY IF EXISTS "insert_staff_payments" ON public.staff_payments;
DROP POLICY IF EXISTS "update_staff_payments" ON public.staff_payments;
DROP POLICY IF EXISTS "delete_staff_payments" ON public.staff_payments;

-- Create new RLS policies for staff_payments that allow proper access
CREATE POLICY "select_staff_payments" ON public.staff_payments
  FOR SELECT USING (
    firm_id IN (
      SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()
      UNION
      SELECT current_firm_id FROM public.profiles WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.firms WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "insert_staff_payments" ON public.staff_payments
  FOR INSERT WITH CHECK (
    firm_id IN (
      SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()
      UNION
      SELECT current_firm_id FROM public.profiles WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.firms WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "update_staff_payments" ON public.staff_payments
  FOR UPDATE USING (
    firm_id IN (
      SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()
      UNION
      SELECT current_firm_id FROM public.profiles WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.firms WHERE created_by = auth.uid()
    )
  ) WITH CHECK (
    firm_id IN (
      SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()
      UNION
      SELECT current_firm_id FROM public.profiles WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.firms WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "delete_staff_payments" ON public.staff_payments
  FOR DELETE USING (
    firm_id IN (
      SELECT firm_id FROM public.profiles WHERE user_id = auth.uid()
      UNION
      SELECT current_firm_id FROM public.profiles WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.firms WHERE created_by = auth.uid()
    )
  );