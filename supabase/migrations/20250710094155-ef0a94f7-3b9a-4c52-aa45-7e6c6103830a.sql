-- Critical Fix: Update Task RLS Policies for Security and Data Access
-- The current task RLS policy references profiles.firm_id instead of profiles.current_firm_id
-- This creates a security breach where users can't access data properly

-- Fix the existing task SELECT policy that has incorrect logic
DROP POLICY IF EXISTS "Staff can view assigned tasks, admins can view all firm tasks" ON public.tasks;

-- Create corrected RLS policy for tasks
CREATE POLICY "Staff can view assigned tasks, admins can view all firm tasks" 
ON public.tasks 
FOR SELECT 
USING (
  -- Admins can see all tasks in their current firm
  (
    firm_id IN (
      SELECT profiles.current_firm_id
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

-- Add missing foreign key constraints for data integrity
-- These are critical for preventing orphaned records and maintaining referential integrity

-- Add foreign key constraint from clients to firms
ALTER TABLE public.clients 
ADD CONSTRAINT fk_clients_firm_id 
FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE;

-- Add foreign key constraint from events to firms  
ALTER TABLE public.events 
ADD CONSTRAINT fk_events_firm_id 
FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE;

-- Add foreign key constraint from events to clients
ALTER TABLE public.events 
ADD CONSTRAINT fk_events_client_id 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add foreign key constraint from tasks to firms
ALTER TABLE public.tasks 
ADD CONSTRAINT fk_tasks_firm_id 
FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE;

-- Add foreign key constraint from tasks to events
ALTER TABLE public.tasks 
ADD CONSTRAINT fk_tasks_event_id 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Add foreign key constraint from tasks to profiles (assigned_to)
ALTER TABLE public.tasks 
ADD CONSTRAINT fk_tasks_assigned_to 
FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add foreign key constraint from tasks to profiles (created_by)
ALTER TABLE public.tasks 
ADD CONSTRAINT fk_tasks_created_by 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add foreign key constraint from payments to firms
ALTER TABLE public.payments 
ADD CONSTRAINT fk_payments_firm_id 
FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE;

-- Add foreign key constraint from payments to events
ALTER TABLE public.payments 
ADD CONSTRAINT fk_payments_event_id 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Add foreign key constraint from expenses to firms
ALTER TABLE public.expenses 
ADD CONSTRAINT fk_expenses_firm_id 
FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE;

-- Add foreign key constraint from quotations to firms
ALTER TABLE public.quotations 
ADD CONSTRAINT fk_quotations_firm_id 
FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE;

-- Add foreign key constraint from quotations to clients
ALTER TABLE public.quotations 
ADD CONSTRAINT fk_quotations_client_id 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add critical database function to prevent data corruption
-- This function ensures that when a firm_id is set, it must be the user's current firm
CREATE OR REPLACE FUNCTION validate_firm_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate if firm_id is being set
  IF NEW.firm_id IS NOT NULL THEN
    -- Check if the firm_id matches the user's current firm
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND current_firm_id = NEW.firm_id
    ) THEN
      RAISE EXCEPTION 'Access denied: Cannot access data from other firms';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the validation trigger to all firm-based tables
CREATE TRIGGER validate_clients_firm_access
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION validate_firm_access();

CREATE TRIGGER validate_events_firm_access
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION validate_firm_access();

CREATE TRIGGER validate_tasks_firm_access
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION validate_firm_access();

CREATE TRIGGER validate_payments_firm_access
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION validate_firm_access();

CREATE TRIGGER validate_expenses_firm_access
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION validate_firm_access();

CREATE TRIGGER validate_quotations_firm_access
  BEFORE INSERT OR UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION validate_firm_access();