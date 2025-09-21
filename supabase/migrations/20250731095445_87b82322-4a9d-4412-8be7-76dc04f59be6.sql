-- Create whatsapp_sessions table for tracking WhatsApp connections per firm
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected',
  qr_code TEXT,
  last_ping TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(firm_id)
);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for whatsapp_sessions
CREATE POLICY "Admins can manage their firm's WhatsApp sessions"
ON public.whatsapp_sessions
FOR ALL
USING (
  firm_id IN (
    SELECT f.id FROM public.firms f 
    WHERE f.created_by = auth.uid()
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_whatsapp_sessions_updated_at
BEFORE UPDATE ON public.whatsapp_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_whatsapp_sessions_firm_id ON public.whatsapp_sessions(firm_id);
CREATE INDEX idx_whatsapp_sessions_status ON public.whatsapp_sessions(status);