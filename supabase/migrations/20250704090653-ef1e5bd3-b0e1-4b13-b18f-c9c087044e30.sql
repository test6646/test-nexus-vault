-- Update RLS policies for tasks to restrict visibility to assigned staff only
DROP POLICY IF EXISTS "Users can view tasks in their firm" ON public.tasks;

-- Create new policy: Staff can only see tasks assigned to them, admins can see all tasks in their firm
CREATE POLICY "Staff can view assigned tasks, admins can view all firm tasks" 
ON public.tasks 
FOR SELECT 
USING (
  -- Admins can see all tasks in their firm
  (
    firm_id IN (
      SELECT profiles.firm_id
      FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'Admin'
    )
  )
  OR
  -- Staff can only see tasks assigned to them
  (
    assigned_to IN (
      SELECT profiles.id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
  )
);