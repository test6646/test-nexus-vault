-- Fix the trigger to handle the missing firm data properly
CREATE OR REPLACE FUNCTION public.sync_firm_info_to_wa_sessions()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- Update wa_sessions with the updated firm information
  UPDATE wa_sessions 
  SET 
    firm_name = NEW.name,
    firm_tagline = COALESCE(NEW.description, ''),
    contact_info = COALESCE(NEW.header_left_content, ''),
    footer_signature = COALESCE(NEW.footer_content, ''),
    updated_at = NOW()
  WHERE firm_id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS sync_firm_info_trigger ON firms;
CREATE TRIGGER sync_firm_info_trigger
  AFTER UPDATE ON firms
  FOR EACH ROW
  EXECUTE FUNCTION sync_firm_info_to_wa_sessions();