-- Create whatsapp_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'disconnected',
  qr_code TEXT,
  connected_at TIMESTAMP WITH TIME ZONE,
  last_ping TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for whatsapp_sessions
CREATE POLICY "Users can manage WhatsApp sessions for their firm"
ON public.whatsapp_sessions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.current_firm_id = whatsapp_sessions.firm_id
    AND p.role = 'Admin'
  )
);

-- Add trigger for timestamps
CREATE TRIGGER update_whatsapp_sessions_updated_at
BEFORE UPDATE ON public.whatsapp_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();