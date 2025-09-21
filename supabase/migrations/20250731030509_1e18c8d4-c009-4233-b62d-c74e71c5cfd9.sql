-- Create WhatsApp sessions table for device linking
CREATE TABLE public.whatsapp_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'disconnected',
  qr_code TEXT,
  connected_at TIMESTAMP WITH TIME ZONE,
  last_ping TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for WhatsApp sessions
CREATE POLICY "Firm admins can manage their WhatsApp sessions" 
ON public.whatsapp_sessions 
FOR ALL 
USING (
  firm_id IN (
    SELECT p.current_firm_id 
    FROM profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'Admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_whatsapp_sessions_updated_at
BEFORE UPDATE ON public.whatsapp_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();