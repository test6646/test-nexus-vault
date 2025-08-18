-- Remove WhatsApp related functionality completely
-- Drop the whatsapp_sessions table and all related objects

-- Drop the trigger first
DROP TRIGGER IF EXISTS update_whatsapp_sessions_updated_at ON public.whatsapp_sessions;

-- Drop the indexes
DROP INDEX IF EXISTS idx_whatsapp_sessions_firm_id;
DROP INDEX IF EXISTS idx_whatsapp_sessions_session_id;

-- Drop the table (this will automatically drop the RLS policies)
DROP TABLE IF EXISTS public.whatsapp_sessions CASCADE;