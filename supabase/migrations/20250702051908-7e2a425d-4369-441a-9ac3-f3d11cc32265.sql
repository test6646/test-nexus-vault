-- Fix firm_members RLS policies to prevent recursion
DROP POLICY IF EXISTS "Admins can manage firm memberships" ON public.firm_members;

-- Create safe policies for firm_members that don't cause recursion
CREATE POLICY "Users can insert their own firm memberships" 
  ON public.firm_members 
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their firm memberships" 
  ON public.firm_members 
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Firm admins can manage memberships in their firms" 
  ON public.firm_members 
  FOR ALL 
  TO authenticated
  USING (
    firm_id IN (
      SELECT f.id 
      FROM public.firms f 
      WHERE f.created_by = auth.uid()
    )
  );

-- Remove any constraints that prevent admin profiles from being created without firm_id
-- (Admin profiles will have firm_id set after firm creation)