-- Clean up wa_sessions sync function to use only existing firm fields
CREATE OR REPLACE FUNCTION public.sync_firm_info_to_wa_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_TABLE_NAME != 'firms' THEN
    RAISE LOG 'sync_firm_info_to_wa_sessions called from wrong table: %', TG_TABLE_NAME;
    RETURN NEW;
  END IF;

  IF NEW.id IS NULL THEN
    RAISE LOG 'sync_firm_info_to_wa_sessions: NEW.id is null';
    RETURN NEW;
  END IF;

  -- Update wa_sessions with clean firm data using existing fields only
  UPDATE wa_sessions
  SET
    firm_name = COALESCE(NEW.name, firm_name),
    firm_tagline = COALESCE(NEW.tagline, firm_tagline),
    contact_info = COALESCE(
      CASE
        WHEN NEW.contact_phone IS NOT NULL OR NEW.contact_email IS NOT NULL THEN
          CONCAT_WS(E'\n',
            CASE WHEN NEW.contact_phone IS NOT NULL THEN 'Contact: ' || NEW.contact_phone END,
            CASE WHEN NEW.contact_email IS NOT NULL THEN 'Email: ' || NEW.contact_email END
          )
        ELSE NULL
      END,
      contact_info
    ),
    footer_signature = COALESCE(NEW.tagline, footer_signature),
    updated_at = NOW()
  WHERE firm_id = NEW.id;

  -- Call edge function for connected sessions
  IF EXISTS (
    SELECT 1
    FROM wa_sessions
    WHERE firm_id = NEW.id
      AND status = 'connected'
  ) THEN
    BEGIN
      PERFORM net.http_post(
        url := 'https://tovnbcputrcfznsnccef.supabase.co/functions/v1/update-whatsapp-firm-info',
        headers := '{
          "Content-Type": "application/json",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdm5iY3B1dHJjZnpuc25jY2VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MjQ5MTIsImV4cCI6MjA2NzAwMDkxMn0.7X9cFnxI389pviWP2U2BAAoPOw-nrfoQk8jSdn3bBpc"
        }'::jsonb,
        body := jsonb_build_object('firmId', NEW.id)
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Error calling update-whatsapp-firm-info edge function: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;