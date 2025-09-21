
-- Enable real-time for whatsapp_sessions table
ALTER TABLE public.whatsapp_sessions REPLICA IDENTITY FULL;

-- Add the table to the real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_sessions;
