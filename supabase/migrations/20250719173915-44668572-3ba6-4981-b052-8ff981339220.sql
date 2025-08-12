-- Fix automatic Google Sheets sync by directly calling the sync function instead of using pg_notify
-- This replaces the pg_notify approach with direct function calls

CREATE OR REPLACE FUNCTION public.trigger_google_sheets_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    firm_spreadsheet_id TEXT;
    item_type TEXT;
    sync_result JSONB;
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
        -- Log the sync trigger
        RAISE LOG 'Google Sheets sync triggered for % % (firm: %)', 
            item_type, COALESCE(NEW.id, OLD.id), COALESCE(NEW.firm_id, OLD.firm_id);
            
        -- Call the sync function directly using net.http_post
        BEGIN
            SELECT net.http_post(
                url := 'https://tovnbcputrcfznsnccef.supabase.co/functions/v1/sync-single-item-to-google',
                headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.supabase_service_role_key', true) || '"}'::jsonb,
                body := json_build_object(
                    'itemType', item_type,
                    'itemId', COALESCE(NEW.id, OLD.id),
                    'firmId', COALESCE(NEW.firm_id, OLD.firm_id)
                )::jsonb
            ) INTO sync_result;
            
            RAISE LOG 'Google Sheets sync completed for % %', item_type, COALESCE(NEW.id, OLD.id);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Google Sheets sync failed for % %: %', item_type, COALESCE(NEW.id, OLD.id), SQLERRM;
        END;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;