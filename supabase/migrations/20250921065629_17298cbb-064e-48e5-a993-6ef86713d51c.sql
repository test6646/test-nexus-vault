-- Comprehensive fix for firm details standardization
-- This migration standardizes firm detail fields and updates existing data

-- Step 1: Update existing firms that have description but no tagline
UPDATE firms 
SET tagline = description 
WHERE tagline IS NULL AND description IS NOT NULL;

-- Step 2: Ensure all firms have proper contact info in dedicated fields
-- Extract phone numbers from header_left_content if contact_phone is null
UPDATE firms 
SET contact_phone = (
  SELECT CASE 
    WHEN header_left_content ~ '\+91\s?\d{5}\s?\d{5}' THEN 
      (regexp_match(header_left_content, '(\+91\s?\d{5}\s?\d{5})'))[1]
    WHEN header_left_content ~ '\+91\d{10}' THEN 
      (regexp_match(header_left_content, '(\+91\d{10})'))[1]
    ELSE NULL
  END
)
WHERE contact_phone IS NULL AND header_left_content IS NOT NULL;

-- Extract email addresses from header_left_content if contact_email is null
UPDATE firms 
SET contact_email = (
  SELECT CASE 
    WHEN header_left_content ~ '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' THEN 
      (regexp_match(header_left_content, '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'))[1]
    ELSE NULL
  END
)
WHERE contact_email IS NULL AND header_left_content IS NOT NULL;

-- Step 3: Update all wa_sessions to use consistent branding fields
UPDATE wa_sessions 
SET firm_tagline = (
  SELECT COALESCE(f.tagline, f.description, 'Your memories, our passion')
  FROM firms f 
  WHERE f.id = wa_sessions.firm_id
),
contact_info = (
  SELECT COALESCE(
    CASE 
      WHEN f.contact_phone IS NOT NULL OR f.contact_email IS NOT NULL THEN
        CONCAT_WS(E'\n', 
          CASE WHEN f.contact_phone IS NOT NULL THEN 'Contact: ' || f.contact_phone END,
          CASE WHEN f.contact_email IS NOT NULL THEN 'Email: ' || f.contact_email END
        )
      ELSE f.header_left_content
    END,
    'Contact: +91 98765 43210'
  )
  FROM firms f 
  WHERE f.id = wa_sessions.firm_id
),
footer_signature = (
  SELECT COALESCE(
    f.footer_content,
    f.name || ' | Contact: ' || COALESCE(f.contact_phone, '+91 98765 43210') || ' | Email: ' || COALESCE(f.contact_email, 'studio@yourfirm.com') || E'\n' || COALESCE(f.tagline, f.description, 'Your memories, our passion') || ' | #aJourneyOfLoveBy' || REPLACE(f.name, ' ', '')
  )
  FROM firms f 
  WHERE f.id = wa_sessions.firm_id
)
WHERE EXISTS (SELECT 1 FROM firms WHERE id = wa_sessions.firm_id);

-- Step 4: Update the sync function to use tagline instead of description
CREATE OR REPLACE FUNCTION public.sync_firm_info_to_wa_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Validate that we have the required fields from firms table
  IF TG_TABLE_NAME != 'firms' THEN
    RAISE LOG 'sync_firm_info_to_wa_sessions called from wrong table: %', TG_TABLE_NAME;
    RETURN NEW;
  END IF;

  -- Ensure NEW record has required fields
  IF NEW.id IS NULL THEN
    RAISE LOG 'sync_firm_info_to_wa_sessions: NEW.id is null';
    RETURN NEW;
  END IF;

  -- Update wa_sessions with the updated firm information using tagline consistently
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

  -- Only call edge function if session exists and is connected
  IF EXISTS (
    SELECT 1 
    FROM wa_sessions 
    WHERE firm_id = NEW.id 
      AND status = 'connected'
  ) THEN
    BEGIN
      PERFORM net.http_post(
        url     := 'https://tovnbcputrcfznsnccef.supabase.co/functions/v1/update-whatsapp-firm-info',
        headers := '{
          "Content-Type": "application/json",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdm5iY3B1dHJjZnpuc25jY2VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MjQ5MTIsImV4cCI6MjA2NzAwMDkxMn0.7X9cFnxI389pviWP2U2BAAoPOw-nrfoQk8jSdn3bBpc"
        }'::jsonb,
        body    := jsonb_build_object('firmId', NEW.id)
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Error calling update-whatsapp-firm-info edge function: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;