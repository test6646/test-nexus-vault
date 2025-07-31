-- Fix WhatsApp sessions table structure
-- Add unique constraint for firm_id to support upsert operations
ALTER TABLE whatsapp_sessions ADD CONSTRAINT unique_firm_id UNIQUE (firm_id);

-- Also add an index for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_firm_id ON whatsapp_sessions(firm_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_session_id ON whatsapp_sessions(session_id);