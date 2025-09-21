-- Remove the problematic validation trigger completely
DROP TRIGGER IF EXISTS validate_tasks_firm_access ON public.tasks;
DROP FUNCTION IF EXISTS validate_tasks_firm_access();

-- Create a more robust validation function that properly handles all cases
CREATE OR REPLACE FUNCTION validate_tasks_firm_access()
RETURNS TRIGGER AS $$
DECLARE
    user_profile_id UUID;
    user_current_firm_id UUID;
    user_role TEXT;
BEGIN
    -- Get current user's profile info
    SELECT id, current_firm_id, role 
    INTO user_profile_id, user_current_firm_id, user_role
    FROM profiles 
    WHERE user_id = auth.uid();
    
    -- If no profile found, deny access
    IF user_profile_id IS NULL THEN
        RAISE EXCEPTION 'Access denied: User profile not found';
    END IF;
    
    -- Skip validation if no firm_id is being set
    IF NEW.firm_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Allow if user is admin in the firm
    IF user_role = 'Admin' AND user_current_firm_id = NEW.firm_id THEN
        RETURN NEW;
    END IF;
    
    -- Allow if user is the assigned staff member (for both INSERT and UPDATE)
    IF NEW.assigned_to = user_profile_id THEN
        RETURN NEW;
    END IF;
    
    -- For UPDATE operations, also check if the user was previously assigned to this task
    IF TG_OP = 'UPDATE' AND OLD.assigned_to = user_profile_id THEN
        RETURN NEW;
    END IF;
    
    -- If none of the above conditions are met, deny access
    RAISE EXCEPTION 'Access denied: Cannot access data from other firms';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the new validation trigger
CREATE TRIGGER validate_tasks_firm_access
    BEFORE INSERT OR UPDATE ON public.tasks
    FOR EACH ROW 
    EXECUTE FUNCTION validate_tasks_firm_access();