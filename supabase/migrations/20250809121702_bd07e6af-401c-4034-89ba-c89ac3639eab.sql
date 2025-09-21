-- Add firm_id column to wa_sessions table to make WhatsApp sessions firm-specific
ALTER TABLE wa_sessions ADD COLUMN firm_id UUID REFERENCES firms(id);

-- Create index for better performance on firm-specific queries
CREATE INDEX idx_wa_sessions_firm_id ON wa_sessions(firm_id);

-- Update existing wa_sessions to include a firm_id (set to NULL for now, will be handled by backend)
-- Note: Existing sessions will need to be re-created with proper firm association