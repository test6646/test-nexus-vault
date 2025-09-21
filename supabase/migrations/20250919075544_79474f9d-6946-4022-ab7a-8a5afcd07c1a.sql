-- Create trigger to automatically sync firm information to wa_sessions when firm details are updated
CREATE OR REPLACE FUNCTION sync_firm_info_to_wa_sessions()
RETURNS TRIGGER AS $$
BEGIN
  -- Update wa_sessions with the updated firm information
  UPDATE wa_sessions 
  SET 
    firm_name = NEW.name,
    firm_tagline = COALESCE(NEW.description, ''),
    contact_info = COALESCE(NEW.header_left_content, ''),
    footer_signature = COALESCE(NEW.footer_content, ''),
    updated_at = NOW()
  WHERE firm_id = NEW.id;
  
  -- Also call the edge function to update backend if session exists and is connected
  IF EXISTS (SELECT 1 FROM wa_sessions WHERE firm_id = NEW.id AND status = 'connected') THEN
    PERFORM net.http_post(
      url := 'https://tovnbcputrcfznsnccef.supabase.co/functions/v1/update-whatsapp-firm-info',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdm5iY3B1dHJjZnpuc25jY2VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MjQ5MTIsImV4cCI6MjA2NzAwMDkxMn0.7X9cFnxI389pviWP2U2BAAoPOw-nrfoQk8jSdn3bBpc"}'::jsonb,
      body := json_build_object('firmId', NEW.id)::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on firms table
DROP TRIGGER IF EXISTS trigger_sync_firm_info_to_wa_sessions ON firms;
CREATE TRIGGER trigger_sync_firm_info_to_wa_sessions
  AFTER UPDATE ON firms
  FOR EACH ROW
  WHEN (OLD.name IS DISTINCT FROM NEW.name OR 
        OLD.description IS DISTINCT FROM NEW.description OR 
        OLD.header_left_content IS DISTINCT FROM NEW.header_left_content OR 
        OLD.footer_content IS DISTINCT FROM NEW.footer_content)
  EXECUTE FUNCTION sync_firm_info_to_wa_sessions();