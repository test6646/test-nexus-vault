-- Revert the trigger to the original pg_notify approach since the direct HTTP call approach has issues
-- This restores the original working trigger that uses pg_notify

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