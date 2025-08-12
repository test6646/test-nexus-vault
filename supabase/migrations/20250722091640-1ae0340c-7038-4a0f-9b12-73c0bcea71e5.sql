-- Create a table to store WhatsApp sessions per firm
CREATE TABLE public.whatsapp_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'disconnected',
  qr_code TEXT,
  connected_at TIMESTAMP WITH TIME ZONE,
  last_ping TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for firm-specific access
CREATE POLICY "Users can manage their firm's WhatsApp session" 
ON public.whatsapp_sessions 
FOR ALL 
TO authenticated
USING (
  firm_id IN (
    SELECT current_firm_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX idx_whatsapp_sessions_firm_id ON public.whatsapp_sessions(firm_id);
CREATE INDEX idx_whatsapp_sessions_session_id ON public.whatsapp_sessions(session_id);

-- Add trigger for updated_at
CREATE TRIGGER update_whatsapp_sessions_updated_at
BEFORE UPDATE ON public.whatsapp_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();