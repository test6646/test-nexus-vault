-- Create WhatsApp sessions table
CREATE TABLE public.whatsapp_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'qr_ready', 'connected', 'error')),
  qr_code TEXT,
  connection_data JSONB,
  last_ping TIMESTAMP WITH TIME ZONE,
  connected_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create WhatsApp connection logs table
CREATE TABLE public.whatsapp_connection_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create WhatsApp fresh sessions table for storing Baileys auth state
CREATE TABLE public.whatsapp_fresh_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(firm_id, file_name)
);

-- Enable RLS
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_connection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_fresh_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for whatsapp_sessions
CREATE POLICY "Users can view sessions for their firms" 
ON public.whatsapp_sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM firm_members fm
    WHERE fm.firm_id = whatsapp_sessions.firm_id 
    AND fm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM firms f
    WHERE f.id = whatsapp_sessions.firm_id 
    AND f.created_by = auth.uid()
  )
);

CREATE POLICY "Users can manage sessions for their firms" 
ON public.whatsapp_sessions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM firm_members fm
    WHERE fm.firm_id = whatsapp_sessions.firm_id 
    AND fm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM firms f
    WHERE f.id = whatsapp_sessions.firm_id 
    AND f.created_by = auth.uid()
  )
);

-- Create policies for whatsapp_connection_logs
CREATE POLICY "Users can view logs for their firms" 
ON public.whatsapp_connection_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM firm_members fm
    WHERE fm.firm_id = whatsapp_connection_logs.firm_id 
    AND fm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM firms f
    WHERE f.id = whatsapp_connection_logs.firm_id 
    AND f.created_by = auth.uid()
  )
);

-- Create policies for whatsapp_fresh_sessions
CREATE POLICY "Users can view fresh sessions for their firms" 
ON public.whatsapp_fresh_sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM firm_members fm
    WHERE fm.firm_id = whatsapp_fresh_sessions.firm_id 
    AND fm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM firms f
    WHERE f.id = whatsapp_fresh_sessions.firm_id 
    AND f.created_by = auth.uid()
  )
);

CREATE POLICY "Users can manage fresh sessions for their firms" 
ON public.whatsapp_fresh_sessions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM firm_members fm
    WHERE fm.firm_id = whatsapp_fresh_sessions.firm_id 
    AND fm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM firms f
    WHERE f.id = whatsapp_fresh_sessions.firm_id 
    AND f.created_by = auth.uid()
  )
);

-- Create functions and triggers
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

CREATE OR REPLACE FUNCTION public.update_whatsapp_fresh_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION public.cleanup_inactive_whatsapp_sessions()
RETURNS VOID AS $$
BEGIN
  -- Mark sessions as inactive if they haven't been pinged in 10 minutes
  UPDATE whatsapp_sessions 
  SET 
    is_active = false,
    status = CASE 
      WHEN status = 'connected' THEN 'disconnected'
      ELSE status
    END,
    updated_at = NOW()
  WHERE 
    last_ping < (NOW() - INTERVAL '10 minutes')
    AND is_active = true;
    
  -- Delete old disconnected sessions older than 7 days
  DELETE FROM whatsapp_sessions 
  WHERE 
    status = 'disconnected' 
    AND is_active = false
    AND updated_at < (NOW() - INTERVAL '7 days');
    
  -- Delete old logs older than 30 days
  DELETE FROM whatsapp_connection_logs 
  WHERE created_at < (NOW() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.validate_whatsapp_sessions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
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

CREATE OR REPLACE FUNCTION public.trigger_whatsapp_session_validation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
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

-- Create triggers
CREATE TRIGGER whatsapp_sessions_updated_at
  BEFORE UPDATE ON public.whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_whatsapp_session_timestamp();

CREATE TRIGGER whatsapp_fresh_sessions_updated_at
  BEFORE UPDATE ON public.whatsapp_fresh_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_whatsapp_fresh_sessions_updated_at();

CREATE TRIGGER whatsapp_log_events
  AFTER INSERT OR UPDATE ON public.whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_whatsapp_event();

CREATE TRIGGER whatsapp_notify_status_change
  AFTER INSERT OR UPDATE ON public.whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_whatsapp_status_change();

CREATE TRIGGER whatsapp_session_validation_trigger
  AFTER UPDATE ON public.whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_whatsapp_session_validation();