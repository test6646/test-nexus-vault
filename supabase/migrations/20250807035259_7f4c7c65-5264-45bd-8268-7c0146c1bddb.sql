-- Remove WhatsApp related tables
DROP TABLE IF EXISTS public.whatsapp_sessions CASCADE;
DROP TABLE IF EXISTS public.whatsapp_connection_logs CASCADE;
DROP TABLE IF EXISTS public.whatsapp_fresh_sessions CASCADE;

-- Remove WhatsApp related functions
DROP FUNCTION IF EXISTS public.cleanup_inactive_whatsapp_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.validate_whatsapp_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.notify_whatsapp_status_change() CASCADE;
DROP FUNCTION IF EXISTS public.log_whatsapp_event() CASCADE;
DROP FUNCTION IF EXISTS public.force_cleanup_whatsapp_sessions(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_whatsapp_session_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_whatsapp_session_validation() CASCADE;
DROP FUNCTION IF EXISTS public.update_whatsapp_session_with_retry_limit() CASCADE;
DROP FUNCTION IF EXISTS public.update_whatsapp_fresh_sessions_updated_at() CASCADE;