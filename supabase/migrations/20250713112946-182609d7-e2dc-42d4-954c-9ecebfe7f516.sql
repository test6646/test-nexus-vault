-- Fix task validation and ensure proper event editing status update

-- First, let's fix the validation trigger to be more permissive for assigned staff
DROP TRIGGER IF EXISTS validate_tasks_firm_access ON public.tasks;

-- Create a better validation function that allows assigned staff to update their tasks
CREATE OR REPLACE FUNCTION validate_tasks_firm_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip validation if no firm_id is being set
  IF NEW.firm_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Allow if user is admin in the firm
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND current_firm_id = NEW.firm_id 
    AND role = 'Admin'
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Allow if user is the assigned staff member
  IF NEW.assigned_to IS NOT NULL AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND id = NEW.assigned_to
  ) THEN
    RETURN NEW;
  END IF;
  
  -- If none of the above conditions are met, deny access
  RAISE EXCEPTION 'Access denied: Cannot access data from other firms';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the new validation trigger
CREATE TRIGGER validate_tasks_firm_access
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION validate_tasks_firm_access();

-- Ensure the event editing status trigger is working properly
-- Drop and recreate the trigger to make sure it's active
DROP TRIGGER IF EXISTS update_event_editing_status_trigger ON public.tasks;

CREATE TRIGGER update_event_editing_status_trigger
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_event_editing_status_on_task_completion();

-- Also make sure the trigger function handles task type properly
CREATE OR REPLACE FUNCTION public.update_event_editing_status_on_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when task status changes to 'Completed'
  IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN
    -- Check if this is a photo editing task
    IF (NEW.task_type = 'Photo Editing' OR LOWER(NEW.title) LIKE '%photo%' OR LOWER(NEW.description) LIKE '%photo%') 
       AND NEW.event_id IS NOT NULL THEN
      UPDATE events 
      SET photo_editing_status = true,
          updated_at = now()
      WHERE id = NEW.event_id;
    END IF;
    
    -- Check if this is a video editing task
    IF (NEW.task_type = 'Video Editing' OR LOWER(NEW.title) LIKE '%video%' OR LOWER(NEW.description) LIKE '%video%') 
       AND NEW.event_id IS NOT NULL THEN
      UPDATE events 
      SET video_editing_status = true,
          updated_at = now()
      WHERE id = NEW.event_id;
    END IF;
  END IF;
  
  -- Reset status if task is uncompleted
  IF OLD.status = 'Completed' AND NEW.status != 'Completed' THEN
    -- Reset photo editing status
    IF (NEW.task_type = 'Photo Editing' OR LOWER(NEW.title) LIKE '%photo%' OR LOWER(NEW.description) LIKE '%photo%') 
       AND NEW.event_id IS NOT NULL THEN
      UPDATE events 
      SET photo_editing_status = false,
          updated_at = now()
      WHERE id = NEW.event_id;
    END IF;
    
    -- Reset video editing status
    IF (NEW.task_type = 'Video Editing' OR LOWER(NEW.title) LIKE '%video%' OR LOWER(NEW.description) LIKE '%video%') 
       AND NEW.event_id IS NOT NULL THEN
      UPDATE events 
      SET video_editing_status = false,
          updated_at = now()
      WHERE id = NEW.event_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;