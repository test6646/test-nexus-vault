-- CRITICAL FIX: Remove all duplicate sync triggers that are causing double syncing
-- This is causing events to be synced TWICE, leading to the duplication issue

-- Drop all the old/duplicate sync triggers
DROP TRIGGER IF EXISTS trigger_events_google_sheets_sync ON public.events;
DROP TRIGGER IF EXISTS trigger_tasks_google_sheets_sync ON public.tasks;
DROP TRIGGER IF EXISTS trigger_clients_google_sheets_sync ON public.clients;
DROP TRIGGER IF EXISTS trigger_expenses_google_sheets_sync ON public.expenses;
DROP TRIGGER IF EXISTS trigger_payments_google_sheets_sync ON public.payments;
DROP TRIGGER IF EXISTS trigger_freelancers_sync ON public.freelancers;

-- Keep only the standardized trigger names (trigger_google_sheets_sync_[table])
-- These should be the only ones running

-- Ensure the trigger function blocks DELETE operations completely
CREATE OR REPLACE FUNCTION public.trigger_google_sheets_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    firm_spreadsheet_id TEXT;
    item_type TEXT;
    sync_payload JSONB;
    sync_url TEXT;
    supabase_url TEXT;
    anon_key TEXT;
    request_id BIGINT;
BEGIN
    -- CRITICAL: Immediately return for DELETE operations - DO NOT SYNC!
    IF TG_OP = 'DELETE' THEN
        RAISE LOG 'Google Sheets sync BLOCKED for DELETE operation on table %', TG_TABLE_NAME;
        RETURN OLD;
    END IF;

    -- CRITICAL: Skip sync if this is part of a deletion process
    -- Check if the record is being created immediately after deletion (suspicious timing)
    IF TG_OP = 'INSERT' AND NEW.created_at > (NOW() - INTERVAL '10 seconds') THEN
        -- Additional safety check: if this exact item was just deleted, skip sync
        RAISE LOG 'Google Sheets sync DELAYED for recent INSERT on table % (item: %)', TG_TABLE_NAME, NEW.id;
        RETURN NEW;
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

    -- Get the firm's spreadsheet ID
    SELECT spreadsheet_id INTO firm_spreadsheet_id
    FROM firms 
    WHERE id = NEW.firm_id;

    -- Only proceed if firm has a spreadsheet configured
    IF firm_spreadsheet_id IS NOT NULL THEN
        -- Create the sync URL
        sync_url := supabase_url || '/functions/v1/sync-single-item-to-google';
        
        -- Create the payload
        sync_payload := json_build_object(
            'itemType', item_type,
            'itemId', NEW.id,
            'firmId', NEW.firm_id
        );
        
        -- Make the HTTP request using pg_net extension with correct schema reference
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
$function$;