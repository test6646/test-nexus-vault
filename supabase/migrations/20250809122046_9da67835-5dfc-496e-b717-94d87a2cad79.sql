-- Clear existing wa_sessions since they're not firm-specific
-- Users will need to reconnect their WhatsApp with the new firm-specific system
DELETE FROM wa_sessions WHERE firm_id IS NULL;