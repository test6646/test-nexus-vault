-- Disable the sync queue trigger for staff signup
DROP TRIGGER IF EXISTS on_user_email_confirmed ON auth.users;

-- Create a simple logging trigger instead
CREATE OR REPLACE FUNCTION public.log_staff_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only log when email_confirmed_at changes from null to not null (user confirms email)
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        RAISE LOG 'Staff email confirmed for user: % (email: %)', NEW.id, NEW.email;
        -- Direct sync will be handled by the application layer
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create new trigger for logging only
CREATE TRIGGER on_user_email_confirmed_log
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.log_staff_confirmation();