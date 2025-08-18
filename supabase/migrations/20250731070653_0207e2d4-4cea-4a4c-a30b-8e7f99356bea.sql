-- First, let's check if whatsapp_sessions table exists and fix any constraint issues
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  status TEXT DEFAULT 'disconnected',
  qr_code TEXT,
  connected_at TIMESTAMP WITH TIME ZONE,
  last_ping TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(firm_id) -- One session per firm
);

-- Enable RLS
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for whatsapp_sessions
CREATE POLICY "Users can view their firm's WhatsApp sessions" 
ON public.whatsapp_sessions 
FOR SELECT 
USING (
  firm_id IN (
    SELECT current_firm_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage their firm's WhatsApp sessions" 
ON public.whatsapp_sessions 
FOR ALL
USING (
  firm_id IN (
    SELECT current_firm_id 
    FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_whatsapp_sessions_updated_at
BEFORE UPDATE ON public.whatsapp_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();