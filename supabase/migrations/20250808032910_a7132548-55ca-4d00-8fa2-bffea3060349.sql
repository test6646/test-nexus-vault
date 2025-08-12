-- Create wa_sessions table for storing Baileys authentication data
CREATE TABLE public.wa_sessions (
  id TEXT PRIMARY KEY,
  session_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.wa_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow all operations (since this is backend-only)
CREATE POLICY "Allow all operations on wa_sessions" 
ON public.wa_sessions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_wa_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wa_sessions_updated_at
    BEFORE UPDATE ON public.wa_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_wa_sessions_updated_at();