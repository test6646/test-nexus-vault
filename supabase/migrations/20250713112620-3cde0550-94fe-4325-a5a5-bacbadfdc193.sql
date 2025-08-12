-- Fix the validate_firm_access trigger to allow assigned staff to update their tasks
-- The current trigger blocks staff from updating tasks they're assigned to

-- First, drop the existing trigger on tasks since it's too restrictive
DROP TRIGGER IF EXISTS validate_tasks_firm_access ON public.tasks;

-- Create a more specific validation function for tasks that allows assigned staff to update
CREATE OR REPLACE FUNCTION validate_tasks_firm_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate if firm_id is being set
  IF NEW.firm_id IS NOT NULL THEN
    -- Check if the user is admin in the firm OR is the assigned staff member
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND (
        -- Admin can access any task in their current firm
        (current_firm_id = NEW.firm_id AND role = 'Admin')
        OR
        -- Staff can access tasks assigned to them
        (id = NEW.assigned_to)
      )
    ) THEN
      RAISE EXCEPTION 'Access denied: Cannot access data from other firms';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the new specific trigger for tasks
CREATE TRIGGER validate_tasks_firm_access
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION validate_tasks_firm_access();

-- Also update the tasks UPDATE RLS policy to be more permissive for assigned staff
DROP POLICY IF EXISTS "Users can update tasks in their firm" ON public.tasks;

CREATE POLICY "Admins and assigned staff can update tasks" 
ON public.tasks 
FOR UPDATE 
USING (
  -- Admins can update all tasks in their current firm
  (
    firm_id IN (
      SELECT profiles.current_firm_id
      FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'Admin'
    )
  )
  OR
  -- Staff can update tasks assigned to them
  (
    assigned_to IN (
      SELECT profiles.id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
  )
);