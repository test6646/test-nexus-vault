-- First, drop the function that references current_firm_id
DROP FUNCTION IF EXISTS get_current_user_current_firm_id();

-- Update all RLS policies to remove current_firm_id references

-- Update staff_payments policies
DROP POLICY IF EXISTS "select_staff_payments" ON staff_payments;
DROP POLICY IF EXISTS "insert_staff_payments" ON staff_payments;
DROP POLICY IF EXISTS "update_staff_payments" ON staff_payments;
DROP POLICY IF EXISTS "delete_staff_payments" ON staff_payments;

CREATE POLICY "select_staff_payments" ON staff_payments
FOR SELECT
USING (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
));

CREATE POLICY "insert_staff_payments" ON staff_payments
FOR INSERT
WITH CHECK (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
));

CREATE POLICY "update_staff_payments" ON staff_payments
FOR UPDATE
USING (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
))
WITH CHECK (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
));

CREATE POLICY "delete_staff_payments" ON staff_payments
FOR DELETE
USING (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
));

-- Update other table policies
DROP POLICY IF EXISTS "Users can manage clients in their firm" ON clients;
CREATE POLICY "Users can manage clients in their firm" ON clients
FOR ALL
USING (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
));

DROP POLICY IF EXISTS "Users can manage events in their firm" ON events;
CREATE POLICY "Users can manage events in their firm" ON events
FOR ALL
USING (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
));

DROP POLICY IF EXISTS "Users can manage tasks in their firm" ON tasks;
CREATE POLICY "Users can manage tasks in their firm" ON tasks
FOR ALL
USING (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
) OR assigned_to IN (
  SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can manage payments in their firm" ON payments;
CREATE POLICY "Users can manage payments in their firm" ON payments
FOR ALL
USING (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
));

DROP POLICY IF EXISTS "Users can manage freelancers in their firm" ON freelancers;
CREATE POLICY "Users can manage freelancers in their firm" ON freelancers
FOR ALL
USING (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
));

DROP POLICY IF EXISTS "Users can manage quotations in their firm" ON quotations;
CREATE POLICY "Users can manage quotations in their firm" ON quotations
FOR ALL
USING (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
));

DROP POLICY IF EXISTS "Users can manage expenses in their firm" ON expenses;
CREATE POLICY "Users can manage expenses in their firm" ON expenses
FOR ALL
USING (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
));

DROP POLICY IF EXISTS "Users can manage staff assignments in their firm" ON event_staff_assignments;
CREATE POLICY "Users can manage staff assignments in their firm" ON event_staff_assignments
FOR ALL
USING (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
));

DROP POLICY IF EXISTS "Users can manage assignment rates in their firm" ON event_assignment_rates;
CREATE POLICY "Users can manage assignment rates in their firm" ON event_assignment_rates
FOR ALL
USING (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
));

DROP POLICY IF EXISTS "Users can manage freelancer payments in their firm" ON freelancer_payments;
CREATE POLICY "Users can manage freelancer payments in their firm" ON freelancer_payments
FOR ALL
USING (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
));

DROP POLICY IF EXISTS "Allow wa_sessions management" ON wa_sessions;
CREATE POLICY "Allow wa_sessions management" ON wa_sessions
FOR ALL
USING (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
) OR auth.role() = 'service_role')
WITH CHECK (firm_id IN (
  SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
  UNION
  SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
) OR auth.role() = 'service_role');

-- Now we can safely drop the current_firm_id column
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_current_firm_id_fkey;
ALTER TABLE profiles DROP COLUMN IF EXISTS current_firm_id;