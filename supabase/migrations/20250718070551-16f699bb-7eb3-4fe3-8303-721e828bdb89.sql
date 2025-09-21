-- Drop the old trigger and function
DROP TRIGGER IF EXISTS on_user_email_confirmed ON auth.users;
DROP FUNCTION IF EXISTS public.sync_new_staff_to_google_sheets();

-- Create improved trigger function that directly calls the edge function
CREATE OR REPLACE FUNCTION public.sync_new_staff_to_google_sheets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    response_data jsonb;
    request_id bigint;
BEGIN
    -- Only trigger when email_confirmed_at changes from null to not null (user confirms email)
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        RAISE LOG 'New staff sync triggered for confirmed user: % (email: %)', NEW.id, NEW.email;
        
        -- Call the edge function directly using the HTTP extension
        SELECT
            net.http_post(
                url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-new-staff-to-google',
                headers := jsonb_build_object(
                    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
                    'Content-Type', 'application/json'
                ),
                body := jsonb_build_object(
                    'user_id', NEW.id,
                    'email', NEW.email,
                    'confirmed_at', NEW.email_confirmed_at
                )
            ) INTO request_id;
            
        RAISE LOG 'Staff sync request sent with ID: %', request_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger on auth.users table for email confirmation
CREATE TRIGGER on_user_email_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_new_staff_to_google_sheets();

-- Set configuration for the trigger function
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://tovnbcputrcfznsnccef.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdm5iY3B1dHJjZnpuc25jY2VmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQyNDkxMiwiZXhwIjoyMDY3MDAwOTEyfQ.RjPqZfXwmKYKJF-RY6Lj1hq_kk3J0tCDOYYb3rOPhGw';