-- Add notification template fields to wa_sessions table
ALTER TABLE public.wa_sessions ADD COLUMN IF NOT EXISTS firm_name text DEFAULT 'PRIT PHOTO';
ALTER TABLE public.wa_sessions ADD COLUMN IF NOT EXISTS firm_tagline text DEFAULT '#aJourneyOfLoveByPritPhoto';
ALTER TABLE public.wa_sessions ADD COLUMN IF NOT EXISTS contact_info text DEFAULT 'Contact: +91 72850 72603';
ALTER TABLE public.wa_sessions ADD COLUMN IF NOT EXISTS footer_signature text DEFAULT 'Your memories, our passion';

-- Add notification template settings
ALTER TABLE public.wa_sessions ADD COLUMN IF NOT EXISTS notification_templates jsonb DEFAULT '{
  "event_confirmation": {
    "title": "EVENT CONFIRMED",
    "greeting": "Dear *{clientName}*,",
    "content": "Your event has been successfully confirmed:"
  },
  "payment_received": {
    "title": "PAYMENT RECEIVED", 
    "greeting": "Dear *{clientName}*,",
    "content": "We have successfully received your payment:"
  },
  "event_assignment": {
    "title": "ASSIGNMENT",
    "greeting": "Dear *{staffName}*,", 
    "content": "You are assigned as *{role}* for the following event:"
  },
  "task_assignment": {
    "title": "TASK ASSIGNMENT",
    "greeting": "Dear *{staffName}*,",
    "content": "A new *{taskType}* task has been assigned to you:"
  },
  "salary_payment": {
    "title": "PAYMENT PROCESSED",
    "greeting": "Dear *{staffName}*,",
    "content": "Your salary payment has been processed:"
  },
  "event_cancellation": {
    "title": "EVENT CANCELLED", 
    "greeting": "Dear *{clientName}*,",
    "content": "We wish to inform you that the following event has been cancelled:"
  }
}'::jsonb;