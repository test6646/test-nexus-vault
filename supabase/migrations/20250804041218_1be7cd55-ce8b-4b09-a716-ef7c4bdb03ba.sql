-- Create function to validate WhatsApp session and auto-disconnect stale sessions
CREATE OR REPLACE FUNCTION validate_whatsapp_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Mark sessions as disconnected if they haven't been pinged in 5 minutes
    UPDATE whatsapp_sessions 
    SET 
        status = 'disconnected',
        updated_at = now()
    WHERE 
        status IN ('connected', 'qr_ready', 'connecting')
        AND last_ping < (now() - interval '5 minutes');
        
    -- Log the cleanup
    RAISE LOG 'WhatsApp session validation completed';
END;
$$;

-- Create trigger function to auto-validate sessions on status changes
CREATE OR REPLACE FUNCTION trigger_whatsapp_session_validation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only validate if we're checking a connected session
    IF NEW.status = 'connected' AND OLD.status != 'connected' THEN
        -- This is a new connection, log it
        RAISE LOG 'New WhatsApp connection detected for session: %', NEW.session_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for session status changes
DROP TRIGGER IF EXISTS whatsapp_session_status_trigger ON whatsapp_sessions;
CREATE TRIGGER whatsapp_session_status_trigger
    AFTER UPDATE ON whatsapp_sessions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_whatsapp_session_validation();