-- WhatsApp sessions table for multi-firm support
CREATE TABLE public.whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL,
  session_id VARCHAR UNIQUE NOT NULL,
  qr_code TEXT,
  status VARCHAR DEFAULT 'disconnected', 
  phone_number VARCHAR,
  connection_data JSONB,
  last_ping TIMESTAMP DEFAULT NOW(),
  connected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Add constraints and indexes
CREATE INDEX idx_whatsapp_sessions_firm_id ON public.whatsapp_sessions(firm_id);
CREATE INDEX idx_whatsapp_sessions_status ON public.whatsapp_sessions(status);
CREATE INDEX idx_whatsapp_sessions_active ON public.whatsapp_sessions(is_active);

-- Ensure only one active session per firm
CREATE UNIQUE INDEX idx_one_active_session_per_firm 
ON public.whatsapp_sessions(firm_id) 
WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for firm-based access
CREATE POLICY "Users can manage WhatsApp sessions for their firm" 
ON public.whatsapp_sessions 
FOR ALL 
USING (firm_id IN (
  SELECT current_firm_id 
  FROM profiles 
  WHERE user_id = auth.uid()
));

-- Enable real-time updates
ALTER TABLE public.whatsapp_sessions REPLICA IDENTITY FULL;

-- WhatsApp connection logs table for debugging
CREATE TABLE public.whatsapp_connection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR NOT NULL,
  firm_id UUID NOT NULL,
  event_type VARCHAR NOT NULL,
  event_data JSONB,
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS for logs
ALTER TABLE public.whatsapp_connection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view WhatsApp logs for their firm" 
ON public.whatsapp_connection_logs 
FOR SELECT 
USING (firm_id IN (
  SELECT current_firm_id 
  FROM profiles 
  WHERE user_id = auth.uid()
));

-- WhatsApp fresh sessions tracking
CREATE TABLE public.whatsapp_fresh_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL,
  session_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_processed BOOLEAN DEFAULT false
);

-- Enable RLS for fresh sessions
ALTER TABLE public.whatsapp_fresh_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage fresh sessions for their firm" 
ON public.whatsapp_fresh_sessions 
FOR ALL 
USING (firm_id IN (
  SELECT current_firm_id 
  FROM profiles 
  WHERE user_id = auth.uid()
));

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_whatsapp_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Update connected_at when status changes to connected
    IF NEW.status = 'connected' AND OLD.status != 'connected' THEN
        NEW.connected_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update fresh sessions timestamp
CREATE OR REPLACE FUNCTION public.update_whatsapp_fresh_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log WhatsApp events
CREATE OR REPLACE FUNCTION public.log_whatsapp_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO whatsapp_connection_logs (
      session_id,
      firm_id,
      event_type,
      event_data,
      message
    ) VALUES (
      NEW.session_id,
      NEW.firm_id,
      NEW.status,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'connection_data', NEW.connection_data
      ),
      CASE 
        WHEN NEW.status = 'connected' THEN 'WhatsApp session connected successfully'
        WHEN NEW.status = 'disconnected' THEN 'WhatsApp session disconnected'
        WHEN NEW.status = 'qr_ready' THEN 'QR code generated and ready for scanning'
        WHEN NEW.status = 'connecting' THEN 'Attempting to connect WhatsApp session'
        WHEN NEW.status = 'error' THEN 'WhatsApp session encountered an error'
        ELSE 'WhatsApp session status changed'
      END
    );
  END IF;
  
  -- Log new sessions
  IF TG_OP = 'INSERT' THEN
    INSERT INTO whatsapp_connection_logs (
      session_id,
      firm_id,
      event_type,
      event_data,
      message
    ) VALUES (
      NEW.session_id,
      NEW.firm_id,
      'session_created',
      jsonb_build_object('initial_status', NEW.status),
      'New WhatsApp session created'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify real-time changes
CREATE OR REPLACE FUNCTION public.notify_whatsapp_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Send real-time notification
  PERFORM pg_notify(
    'whatsapp_status_' || NEW.firm_id::text,
    json_build_object(
      'event_type', TG_OP,
      'session_id', NEW.session_id,
      'status', NEW.status,
      'qr_code', CASE WHEN NEW.qr_code IS NOT NULL THEN 'available' ELSE null END,
      'connected_at', NEW.connected_at,
      'timestamp', extract(epoch from NOW())
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate and cleanup sessions
CREATE OR REPLACE FUNCTION public.validate_whatsapp_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
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

-- Function to trigger session validation
CREATE OR REPLACE FUNCTION public.trigger_whatsapp_session_validation()
RETURNS TRIGGER AS $$
BEGIN
    -- Only validate if we're checking a connected session
    IF NEW.status = 'connected' AND OLD.status != 'connected' THEN
        -- This is a new connection, log it
        RAISE LOG 'New WhatsApp connection detected for session: %', NEW.session_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp';

-- Function to cleanup inactive sessions
CREATE OR REPLACE FUNCTION public.cleanup_inactive_whatsapp_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark sessions as inactive if no ping in last 10 minutes
  UPDATE public.whatsapp_sessions
  SET is_active = false, status = 'disconnected'
  WHERE last_ping < (now() - INTERVAL '10 minutes')
    AND is_active = true;
END;
$$;

-- Create triggers
CREATE TRIGGER update_whatsapp_sessions_timestamp
    BEFORE UPDATE ON public.whatsapp_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_whatsapp_session_timestamp();

CREATE TRIGGER update_whatsapp_fresh_sessions_timestamp
    BEFORE UPDATE ON public.whatsapp_fresh_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_whatsapp_fresh_sessions_updated_at();

CREATE TRIGGER log_whatsapp_events
    AFTER INSERT OR UPDATE ON public.whatsapp_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.log_whatsapp_event();

CREATE TRIGGER notify_whatsapp_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.whatsapp_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_whatsapp_status_change();

CREATE TRIGGER validate_whatsapp_session_trigger
    AFTER UPDATE ON public.whatsapp_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_whatsapp_session_validation();