-- CRITICAL FIX: Remove duplicate and problematic triggers that cause loops and data inconsistencies

-- 1. Drop the problematic Google Sheets sync trigger that causes loops during deletions
DROP TRIGGER IF EXISTS trigger_google_sheets_sync_events ON public.events;
DROP TRIGGER IF EXISTS trigger_google_sheets_sync_clients ON public.clients;
DROP TRIGGER IF EXISTS trigger_google_sheets_sync_payments ON public.payments;
DROP TRIGGER IF EXISTS trigger_google_sheets_sync_expenses ON public.expenses;
DROP TRIGGER IF EXISTS trigger_google_sheets_sync_freelancers ON public.freelancers;
DROP TRIGGER IF EXISTS trigger_google_sheets_sync_tasks ON public.tasks;

-- 2. Drop duplicate payment balance triggers - keep only one clean implementation
DROP TRIGGER IF EXISTS trigger_update_event_amounts_on_payment_delete ON public.payments;
DROP TRIGGER IF EXISTS trigger_update_event_amounts_on_payment_insert ON public.payments;
DROP TRIGGER IF EXISTS trigger_update_event_amounts_on_payment_update ON public.payments;

-- 3. Drop the old update_event_balance function triggers (we'll keep the update_event_amounts_on_payment)
DROP TRIGGER IF EXISTS trigger_update_event_balance_on_payment_delete ON public.payments;
DROP TRIGGER IF EXISTS trigger_update_event_balance_on_payment_insert ON public.payments;
DROP TRIGGER IF EXISTS trigger_update_event_balance_on_payment_update ON public.payments;

-- 4. Create a single, clean payment balance update trigger
CREATE TRIGGER update_event_payment_amounts
    AFTER INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW 
    EXECUTE FUNCTION update_event_amounts_on_payment();

-- 5. Create a safer Google Sheets sync trigger that ONLY syncs on INSERT and UPDATE (NOT DELETE)
-- This prevents the loop where deletion triggers sync which creates new records
CREATE OR REPLACE FUNCTION safe_trigger_google_sheets_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    firm_spreadsheet_id TEXT;
    item_type TEXT;
    sync_payload JSONB;
    sync_url TEXT;
    supabase_url TEXT;
    anon_key TEXT;
    request_id BIGINT;
BEGIN
    -- CRITICAL: Skip all DELETE operations to prevent loops
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    -- Get environment variables
    supabase_url := 'https://tovnbcputrcfznsnccef.supabase.co';
    anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdm5iY3B1dHJjZnpuc25jY2VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MjQ5MTIsImV4cCI6MjA2NzAwMDkxMn0.7X9cFnxI389pviWP2U2BAAoPOw-nrfoQk8jSdn3bBpc';

    -- Determine the item type based on the table
    CASE TG_TABLE_NAME
        WHEN 'clients' THEN item_type := 'client';
        WHEN 'events' THEN item_type := 'event';
        WHEN 'tasks' THEN item_type := 'task';
        WHEN 'expenses' THEN item_type := 'expense';
        WHEN 'freelancers' THEN item_type := 'freelancer';
        WHEN 'payments' THEN item_type := 'payment';
        ELSE RETURN NEW;
    END CASE;

    -- Get the firm's spreadsheet ID safely
    SELECT spreadsheet_id INTO firm_spreadsheet_id
    FROM firms 
    WHERE id = NEW.firm_id;

    -- Only proceed if firm has a spreadsheet configured
    IF firm_spreadsheet_id IS NOT NULL AND firm_spreadsheet_id != '' THEN
        -- Create the sync URL
        sync_url := supabase_url || '/functions/v1/sync-single-item-to-google';
        
        -- Create the payload
        sync_payload := json_build_object(
            'itemType', item_type,
            'itemId', NEW.id,
            'firmId', NEW.firm_id
        );
        
        -- Make the HTTP request using pg_net extension with error handling
        BEGIN
            SELECT INTO request_id
                net.http_post(
                    url := sync_url,
                    headers := json_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || anon_key
                    )::jsonb,
                    body := sync_payload::jsonb
                );
            
            -- Log success
            RAISE LOG 'Google Sheets sync triggered for % % (firm: %) - Request ID: %', 
                item_type, NEW.id, NEW.firm_id, request_id;
                
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the original operation
            RAISE LOG 'Google Sheets sync failed for % %: %', 
                item_type, NEW.id, SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$;

-- 6. Create the safe Google Sheets sync triggers (INSERT and UPDATE only)
CREATE TRIGGER safe_sync_events
    AFTER INSERT OR UPDATE ON public.events
    FOR EACH ROW 
    EXECUTE FUNCTION safe_trigger_google_sheets_sync();

CREATE TRIGGER safe_sync_clients
    AFTER INSERT OR UPDATE ON public.clients
    FOR EACH ROW 
    EXECUTE FUNCTION safe_trigger_google_sheets_sync();

CREATE TRIGGER safe_sync_payments
    AFTER INSERT OR UPDATE ON public.payments
    FOR EACH ROW 
    EXECUTE FUNCTION safe_trigger_google_sheets_sync();

CREATE TRIGGER safe_sync_expenses
    AFTER INSERT OR UPDATE ON public.expenses
    FOR EACH ROW 
    EXECUTE FUNCTION safe_trigger_google_sheets_sync();

CREATE TRIGGER safe_sync_freelancers
    AFTER INSERT OR UPDATE ON public.freelancers
    FOR EACH ROW 
    EXECUTE FUNCTION safe_trigger_google_sheets_sync();

CREATE TRIGGER safe_sync_tasks
    AFTER INSERT OR UPDATE ON public.tasks
    FOR EACH ROW 
    EXECUTE FUNCTION safe_trigger_google_sheets_sync();