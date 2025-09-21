-- Create database triggers for automatic Google Sheets syncing
-- This will ensure that whenever a client, event, task, or expense is created/updated,
-- it automatically syncs to Google Sheets

-- First, create a function to trigger Google Sheets sync
CREATE OR REPLACE FUNCTION public.trigger_google_sheets_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    firm_spreadsheet_id TEXT;
    item_type TEXT;
BEGIN
    -- Determine the item type based on the table
    CASE TG_TABLE_NAME
        WHEN 'clients' THEN item_type := 'client';
        WHEN 'events' THEN item_type := 'event';
        WHEN 'tasks' THEN item_type := 'task';
        WHEN 'expenses' THEN item_type := 'expense';
        ELSE RETURN COALESCE(NEW, OLD);
    END CASE;

    -- Get the firm's spreadsheet ID
    SELECT spreadsheet_id INTO firm_spreadsheet_id
    FROM firms 
    WHERE id = COALESCE(NEW.firm_id, OLD.firm_id);

    -- Only proceed if firm has a spreadsheet configured
    IF firm_spreadsheet_id IS NOT NULL THEN
        -- Use pg_notify to send sync request (non-blocking)
        PERFORM pg_notify(
            'google_sheets_sync',
            json_build_object(
                'item_type', item_type,
                'item_id', COALESCE(NEW.id, OLD.id),
                'firm_id', COALESCE(NEW.firm_id, OLD.firm_id),
                'operation', TG_OP
            )::text
        );
        
        -- Log the sync trigger
        RAISE LOG 'Google Sheets sync triggered for % % (firm: %)', 
            item_type, COALESCE(NEW.id, OLD.id), COALESCE(NEW.firm_id, OLD.firm_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for each table
-- Clients table triggers
DROP TRIGGER IF EXISTS trigger_clients_google_sheets_sync ON public.clients;
CREATE TRIGGER trigger_clients_google_sheets_sync
    AFTER INSERT OR UPDATE OR DELETE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_google_sheets_sync();

-- Events table triggers  
DROP TRIGGER IF EXISTS trigger_events_google_sheets_sync ON public.events;
CREATE TRIGGER trigger_events_google_sheets_sync
    AFTER INSERT OR UPDATE OR DELETE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_google_sheets_sync();

-- Tasks table triggers
DROP TRIGGER IF EXISTS trigger_tasks_google_sheets_sync ON public.tasks;
CREATE TRIGGER trigger_tasks_google_sheets_sync
    AFTER INSERT OR UPDATE OR DELETE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_google_sheets_sync();

-- Expenses table triggers
DROP TRIGGER IF EXISTS trigger_expenses_google_sheets_sync ON public.expenses;
CREATE TRIGGER trigger_expenses_google_sheets_sync
    AFTER INSERT OR UPDATE OR DELETE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_google_sheets_sync();

-- Create a function to handle the background sync processing
-- This will be called by an edge function that listens for notifications
CREATE OR REPLACE FUNCTION public.process_google_sheets_sync_queue()
RETURNS TABLE(
    item_type TEXT,
    item_id UUID,
    firm_id UUID,
    operation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function can be enhanced later to maintain a sync queue
    -- For now, it's a placeholder for future queue management
    RETURN;
END;
$$;