-- Set replica identity to full for complete real-time data
ALTER TABLE whatsapp_sessions REPLICA IDENTITY FULL;

-- Create a function to notify real-time listeners
CREATE OR REPLACE FUNCTION notify_whatsapp_session_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Send real-time notification with session data
    PERFORM pg_notify(
        'whatsapp_session_' || COALESCE(NEW.firm_id::text, OLD.firm_id::text),
        json_build_object(
            'event_type', TG_OP,
            'session_id', COALESCE(NEW.session_id, OLD.session_id),
            'status', COALESCE(NEW.status, 'deleted'),
            'qr_code', CASE WHEN NEW.qr_code IS NOT NULL THEN 'available' ELSE 'none' END,
            'timestamp', extract(epoch from now())
        )::text
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for real-time notifications
DROP TRIGGER IF EXISTS whatsapp_session_notify_trigger ON whatsapp_sessions;
CREATE TRIGGER whatsapp_session_notify_trigger
    AFTER INSERT OR UPDATE OR DELETE ON whatsapp_sessions
    FOR EACH ROW
    EXECUTE FUNCTION notify_whatsapp_session_change();

-- Create function for automatic session cleanup
CREATE OR REPLACE FUNCTION cleanup_stale_whatsapp_sessions()
RETURNS void AS $$
BEGIN
    -- Mark sessions as disconnected if no ping for 2 minutes
    UPDATE whatsapp_sessions 
    SET 
        status = 'disconnected',
        updated_at = now()
    WHERE 
        status IN ('connected', 'qr_ready', 'connecting')
        AND last_ping < (now() - interval '2 minutes');
        
    -- Delete very old disconnected sessions (older than 1 hour)
    DELETE FROM whatsapp_sessions 
    WHERE 
        status = 'disconnected' 
        AND updated_at < (now() - interval '1 hour');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;