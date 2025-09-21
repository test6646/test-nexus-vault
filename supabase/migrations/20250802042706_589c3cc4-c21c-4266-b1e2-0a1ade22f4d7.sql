
-- Create the whatsapp_sessions table to store WhatsApp session information
CREATE TABLE public.whatsapp_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID REFERENCES public.firms(id) NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'disconnected',
  qr_code TEXT,
  connected_at TIMESTAMP WITH TIME ZONE,
  last_ping TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS) 
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to access sessions for their current firm
CREATE POLICY "Users can access WhatsApp sessions for their current firm" 
  ON public.whatsapp_sessions 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND current_firm_id = whatsapp_sessions.firm_id
    )
  );

-- Add trigger to update the updated_at column
CREATE TRIGGER update_whatsapp_sessions_updated_at
    BEFORE UPDATE ON public.whatsapp_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_whatsapp_sessions_firm_id ON public.whatsapp_sessions(firm_id);
CREATE INDEX idx_whatsapp_sessions_session_id ON public.whatsapp_sessions(session_id);
CREATE INDEX idx_whatsapp_sessions_status ON public.whatsapp_sessions(status);
