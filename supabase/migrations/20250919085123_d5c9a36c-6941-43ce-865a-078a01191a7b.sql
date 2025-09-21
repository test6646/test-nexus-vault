-- Fix WhatsApp session storage issue by removing duplicate trigger
-- and improving error handling in sync function

-- Step 1: Remove the duplicate trigger that's causing conflicts
DROP TRIGGER IF EXISTS sync_firm_info_trigger ON public.firms;

-- Step 2: Improve the sync_firm_info_to_wa_sessions function with better error handling
CREATE OR REPLACE FUNCTION public.sync_firm_info_to_wa_sessions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Validate that we have the required fields from firms table
  IF TG_TABLE_NAME != 'firms' THEN
    RAISE LOG 'sync_firm_info_to_wa_sessions called from wrong table: %', TG_TABLE_NAME;
    RETURN NEW;
  END IF;

  -- Ensure NEW record has required fields
  IF NEW.id IS NULL THEN
    RAISE LOG 'sync_firm_info_to_wa_sessions: NEW.id is null';
    RETURN NEW;
  END IF;

  -- Update wa_sessions with the updated firm information
  UPDATE wa_sessions
  SET 
    firm_name        = COALESCE(NEW.name, firm_name),
    firm_tagline     = COALESCE(NEW.description, firm_tagline),
    contact_info     = COALESCE(NEW.header_left_content, contact_info),
    footer_signature = COALESCE(NEW.footer_content, footer_signature),
    updated_at       = NOW()
  WHERE firm_id = NEW.id;

  -- Only call edge function if session exists and is connected
  IF EXISTS (
    SELECT 1 
    FROM wa_sessions 
    WHERE firm_id = NEW.id 
      AND status = 'connected'
  ) THEN
    BEGIN
      PERFORM net.http_post(
        url     := 'https://tovnbcputrcfznsnccef.supabase.co/functions/v1/update-whatsapp-firm-info',
        headers := '{
          "Content-Type": "application/json",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdm5iY3B1dHJjZnpuc25jY2VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MjQ5MTIsImV4cCI6MjA2NzAwMDkxMn0.7X9cFnxI389pviWP2U2BAAoPOw-nrfoQk8jSdn3bBpc"
        }'::jsonb,
        body    := jsonb_build_object('firmId', NEW.id)
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Error calling update-whatsapp-firm-info edge function: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;