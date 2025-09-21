-- Add dedicated contact fields to firms table and improve firm data structure
ALTER TABLE firms 
  ADD COLUMN contact_phone text,
  ADD COLUMN contact_email text,
  ADD COLUMN tagline text;

-- Update existing firms to extract contact info from header_left_content where possible
UPDATE firms 
SET 
  contact_phone = CASE 
    WHEN header_left_content ~ '\+91\s?\d{5}\s?\d{5}|\+91\d{10}' THEN 
      substring(header_left_content from '\+91\s?\d{5}\s?\d{5}|\+91\d{10}')
    ELSE NULL
  END,
  contact_email = CASE 
    WHEN header_left_content ~ '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' THEN 
      substring(header_left_content from '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
    ELSE NULL
  END,
  tagline = COALESCE(description, 'Your memories, our passion');

-- Create trigger to sync firm info to WhatsApp sessions when firm contact details change
CREATE OR REPLACE FUNCTION sync_firm_contact_to_wa_sessions()
RETURNS TRIGGER AS $$
BEGIN
  -- Update wa_sessions with the updated firm information including new contact fields
  UPDATE wa_sessions
  SET 
    firm_name        = COALESCE(NEW.name, firm_name),
    firm_tagline     = COALESCE(NEW.tagline, NEW.description, firm_tagline),
    contact_info     = COALESCE(
      CASE 
        WHEN NEW.contact_phone IS NOT NULL OR NEW.contact_email IS NOT NULL THEN
          CONCAT_WS(E'\n', 
            CASE WHEN NEW.contact_phone IS NOT NULL THEN 'Contact: ' || NEW.contact_phone END,
            CASE WHEN NEW.contact_email IS NOT NULL THEN 'Email: ' || NEW.contact_email END
          )
        ELSE NEW.header_left_content
      END, 
      contact_info
    ),
    footer_signature = COALESCE(NEW.footer_content, footer_signature),
    updated_at       = NOW()
  WHERE firm_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Create trigger for firm contact info sync
DROP TRIGGER IF EXISTS sync_firm_contact_info_trigger ON firms;
CREATE TRIGGER sync_firm_contact_info_trigger
  AFTER UPDATE OF name, tagline, description, contact_phone, contact_email, header_left_content, footer_content ON firms
  FOR EACH ROW
  EXECUTE FUNCTION sync_firm_contact_to_wa_sessions();