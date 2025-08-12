-- RESTORE AUTOMATIC GOOGLE SHEETS SYNC BUT FIX DUPLICATES

-- First, drop the manual-only triggers I created
DROP TRIGGER IF EXISTS update_payment_balance_only ON public.payments;
DROP TRIGGER IF EXISTS update_editing_status_only ON public.tasks;

-- Create proper automatic sync triggers (single, clean ones)
CREATE TRIGGER automatic_sync_events
    AFTER INSERT OR UPDATE OR DELETE ON public.events
    FOR EACH ROW 
    EXECUTE FUNCTION safe_trigger_google_sheets_sync();

CREATE TRIGGER automatic_sync_payments
    AFTER INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW 
    EXECUTE FUNCTION safe_trigger_google_sheets_sync();

-- Create the missing sync function if it doesn't exist
CREATE OR REPLACE FUNCTION safe_trigger_google_sheets_sync()
RETURNS TRIGGER AS $$
DECLARE
    firm_uuid UUID;
BEGIN
    -- Get firm_id from the record
    IF TG_OP = 'DELETE' THEN
        firm_uuid := OLD.firm_id;
    ELSE
        firm_uuid := NEW.firm_id;
    END IF;
    
    -- Only proceed if we have a firm_id
    IF firm_uuid IS NOT NULL THEN
        -- Log the sync trigger
        RAISE LOG 'Google Sheets sync triggered for % % (firm: %) - Request ID: %', 
            TG_TABLE_NAME, 
            COALESCE(NEW.id, OLD.id),
            firm_uuid,
            (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
        
        -- Trigger the sync function call
        PERFORM net.http_post(
            url := 'https://tovnbcputrcfznsnccef.supabase.co/functions/v1/sync-single-item-to-google',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdm5iY3B1dHJjZnpuc25jY2VmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQyNDkxMiwiZXhwIjoyMDY3MDAwOTEyfQ.oYbrUDNSU9kQA7s0wJPHacCMEKd-_CXzF5tFhANwGXs"}'::jsonb,
            body := json_build_object(
                'table_name', TG_TABLE_NAME,
                'operation', TG_OP,
                'record_id', COALESCE(NEW.id, OLD.id),
                'firm_id', firm_uuid
            )::jsonb
        );
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore payment balance trigger
CREATE TRIGGER update_event_balance_on_payment
    AFTER INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW 
    EXECUTE FUNCTION update_event_amounts_on_payment();

-- Restore task editing status trigger  
CREATE TRIGGER update_editing_status_on_task
    AFTER UPDATE ON public.tasks
    FOR EACH ROW 
    EXECUTE FUNCTION update_event_editing_status_on_task_completion();