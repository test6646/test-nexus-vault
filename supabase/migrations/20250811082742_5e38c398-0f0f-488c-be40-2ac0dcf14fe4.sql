-- Fix foreign key constraint issues and RLS policies

-- First, let's check and fix the tasks table constraints
-- Remove the problematic foreign key constraint if it exists
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;

-- Recreate the constraint to reference profiles(id) instead of potentially auth.users
ALTER TABLE tasks 
ADD CONSTRAINT tasks_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL;

-- Ensure RLS policies are working correctly for firm access during signup
-- Fix firms table policies to allow viewing firms for signup
DROP POLICY IF EXISTS "Users can view their own firm" ON firms;
DROP POLICY IF EXISTS "Allow firm viewing for signup" ON firms;

-- Create a policy that allows viewing firms for non-admin users during signup
CREATE POLICY "Allow firm viewing for signup" ON firms
FOR SELECT 
USING (true);

-- Fix firm_members table to ensure proper access
DROP POLICY IF EXISTS "Users can view their own firm memberships" ON firm_members;
DROP POLICY IF EXISTS "Users can insert their own firm memberships" ON firm_members;
DROP POLICY IF EXISTS "Firm admins can manage memberships in their firms" ON firm_members;

-- Recreate firm_members policies with proper logic
CREATE POLICY "Users can view their own firm memberships" ON firm_members
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own firm memberships" ON firm_members
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Firm admins can manage memberships in their firms" ON firm_members
FOR ALL 
USING (firm_id IN (SELECT id FROM firms WHERE created_by = auth.uid()));

-- Fix event_assignment_rates table to include both staff and freelancer assignments
DROP POLICY IF EXISTS "Allow all operations on event_assignment_rates" ON event_assignment_rates;

CREATE POLICY "Allow all operations on event_assignment_rates" ON event_assignment_rates
FOR ALL 
USING (firm_id = get_current_user_current_firm_id());

-- Ensure profiles table works correctly
DROP POLICY IF EXISTS "Users can view profiles in their firm" ON profiles;

CREATE POLICY "Users can view profiles in their firm" ON profiles
FOR SELECT 
USING (
    user_id = auth.uid() OR 
    firm_id = get_current_user_current_firm_id() OR 
    current_firm_id = get_current_user_current_firm_id()
);