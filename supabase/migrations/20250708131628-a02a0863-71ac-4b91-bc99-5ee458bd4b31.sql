-- Fix RLS policies for event_staff_assignments table
-- The issue is that the policies reference profiles.firm_id but it should be profiles.current_firm_id

DROP POLICY IF EXISTS "Users can view event staff assignments in their firm" ON public.event_staff_assignments;
DROP POLICY IF EXISTS "Users can insert event staff assignments in their firm" ON public.event_staff_assignments;
DROP POLICY IF EXISTS "Users can update event staff assignments in their firm" ON public.event_staff_assignments;

-- Create corrected RLS policies
CREATE POLICY "Users can view event staff assignments in their firm"
ON public.event_staff_assignments
FOR SELECT
USING (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Users can insert event staff assignments in their firm"
ON public.event_staff_assignments
FOR INSERT
WITH CHECK (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Users can update event staff assignments in their firm"
ON public.event_staff_assignments
FOR UPDATE
USING (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

-- Also fix other tables that might have the same issue
-- Let's check and fix the RLS policies for all tables

-- Fix clients table RLS policies
DROP POLICY IF EXISTS "Users can view clients in their firm" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients in their firm" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients in their firm" ON public.clients;

CREATE POLICY "Users can view clients in their firm"
ON public.clients
FOR SELECT
USING (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Users can insert clients in their firm"
ON public.clients
FOR INSERT
WITH CHECK (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Users can update clients in their firm"
ON public.clients
FOR UPDATE
USING (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

-- Fix events table RLS policies
DROP POLICY IF EXISTS "Users can view events in their firm" ON public.events;
DROP POLICY IF EXISTS "Users can insert events in their firm" ON public.events;
DROP POLICY IF EXISTS "Users can update events in their firm" ON public.events;

CREATE POLICY "Users can view events in their firm"
ON public.events
FOR SELECT
USING (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Users can insert events in their firm"
ON public.events
FOR INSERT
WITH CHECK (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Users can update events in their firm"
ON public.events
FOR UPDATE
USING (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

-- Fix all other tables with similar RLS policies
-- expenses table
DROP POLICY IF EXISTS "Users can view expenses in their firm" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert expenses in their firm" ON public.expenses;
DROP POLICY IF EXISTS "Users can update expenses in their firm" ON public.expenses;

CREATE POLICY "Users can view expenses in their firm"
ON public.expenses
FOR SELECT
USING (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Users can insert expenses in their firm"
ON public.expenses
FOR INSERT
WITH CHECK (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Users can update expenses in their firm"
ON public.expenses
FOR UPDATE
USING (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

-- payments table
DROP POLICY IF EXISTS "Users can view payments in their firm" ON public.payments;
DROP POLICY IF EXISTS "Users can insert payments in their firm" ON public.payments;
DROP POLICY IF EXISTS "Users can update payments in their firm" ON public.payments;

CREATE POLICY "Users can view payments in their firm"
ON public.payments
FOR SELECT
USING (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Users can insert payments in their firm"
ON public.payments
FOR INSERT
WITH CHECK (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Users can update payments in their firm"
ON public.payments
FOR UPDATE
USING (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

-- notifications table  
DROP POLICY IF EXISTS "Users can insert notifications in their firm" ON public.notifications;

CREATE POLICY "Users can insert notifications in their firm"
ON public.notifications
FOR INSERT
WITH CHECK (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

-- quotations table
DROP POLICY IF EXISTS "Users can view quotations in their firm" ON public.quotations;
DROP POLICY IF EXISTS "Users can insert quotations in their firm" ON public.quotations;
DROP POLICY IF EXISTS "Users can update quotations in their firm" ON public.quotations;

CREATE POLICY "Users can view quotations in their firm"
ON public.quotations
FOR SELECT
USING (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Users can insert quotations in their firm"
ON public.quotations
FOR INSERT
WITH CHECK (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Users can update quotations in their firm"
ON public.quotations
FOR UPDATE
USING (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

-- staff_payments table
DROP POLICY IF EXISTS "Users can view staff payments in their firm" ON public.staff_payments;
DROP POLICY IF EXISTS "Users can insert staff payments in their firm" ON public.staff_payments;
DROP POLICY IF EXISTS "Users can update staff payments in their firm" ON public.staff_payments;

CREATE POLICY "Users can view staff payments in their firm"
ON public.staff_payments
FOR SELECT
USING (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Users can insert staff payments in their firm"
ON public.staff_payments
FOR INSERT
WITH CHECK (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Users can update staff payments in their firm"
ON public.staff_payments
FOR UPDATE
USING (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

-- tasks table
DROP POLICY IF EXISTS "Users can insert tasks in their firm" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks in their firm" ON public.tasks;

CREATE POLICY "Users can insert tasks in their firm"
ON public.tasks
FOR INSERT
WITH CHECK (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Users can update tasks in their firm"
ON public.tasks
FOR UPDATE
USING (firm_id IN (
  SELECT profiles.current_firm_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));