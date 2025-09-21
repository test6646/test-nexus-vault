-- Drop the existing wa_sessions table
DROP TABLE IF EXISTS public.wa_sessions;

-- Create the new wa_sessions table with proper defaults
CREATE TABLE public.wa_sessions (
  id text NOT NULL PRIMARY KEY,
  firm_id uuid NOT NULL,
  firm_name text DEFAULT 'YOUR_FIRM_NAME',
  firm_tagline text DEFAULT 'YOUR_FIRM_TAGLINE', 
  contact_info text DEFAULT 'Contact: YOUR_FIRM_CONTACT\nEmail: YOUR_FIRM_CONTACT_EMAIL',
  footer_signature text DEFAULT 'YOUR_FIRM_NAME | Contact: YOUR_FIRM_CONTACT | Email: YOUR_FIRM_CONTACT_EMAIL\nYOUR_FIRM_TAGLINE | YOUR_FIRM_SIGNATURE',
  status text NOT NULL DEFAULT 'disconnected',
  session_data jsonb DEFAULT NULL,
  qr_expires_at timestamp with time zone DEFAULT NULL,
  reconnect_enabled boolean NOT NULL DEFAULT false,
  notification_templates jsonb DEFAULT '{
    "salary_payment": {
      "title": "PAYMENT PROCESSED",
      "content": "Your salary payment has been processed:",
      "greeting": "Dear *{staffName}*,"
    },
    "task_assignment": {
      "title": "TASK ASSIGNMENT", 
      "content": "A new *{taskType}* task has been assigned to you:",
      "greeting": "Dear *{staffName}*,"
    },
    "event_assignment": {
      "title": "ASSIGNMENT",
      "content": "You are assigned as *{role}* for the following event:",
      "greeting": "Dear *{staffName}*,"
    },
    "payment_received": {
      "title": "PAYMENT RECEIVED",
      "content": "We have successfully received your payment:",
      "greeting": "Dear *{clientName}*,"
    },
    "event_cancellation": {
      "title": "EVENT CANCELLED",
      "content": "We wish to inform you that the following event has been cancelled:",
      "greeting": "Dear *{clientName}*,"
    },
    "event_confirmation": {
      "title": "EVENT CONFIRMED", 
      "content": "Your event has been successfully confirmed:",
      "greeting": "Dear *{clientName}*,"
    }
  }'::jsonb,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wa_sessions ENABLE ROW LEVEL SECURITY;

-- Recreate the RLS policy
CREATE POLICY "Allow wa_sessions management" 
ON public.wa_sessions 
FOR ALL
USING (
  firm_id IN (
    SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
    UNION
    SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
  ) OR auth.role() = 'service_role'::text
)
WITH CHECK (
  firm_id IN (
    SELECT profiles.firm_id FROM profiles WHERE profiles.user_id = auth.uid()
    UNION
    SELECT firms.id FROM firms WHERE firms.created_by = auth.uid()
  ) OR auth.role() = 'service_role'::text
);

-- Recreate the update trigger
CREATE OR REPLACE FUNCTION public.update_wa_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_wa_sessions_updated_at
    BEFORE UPDATE ON public.wa_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_wa_sessions_updated_at();