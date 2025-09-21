-- Fix the event_update notification template to use clientName instead of staffName for client notifications
UPDATE wa_sessions 
SET notification_templates = jsonb_set(
  notification_templates,
  '{event_update}',
  jsonb_build_object(
    'title', 'EVENT UPDATED',
    'greeting', 'Dear *{clientName}*,',
    'content', 'Your event details have been updated:'
  )
)
WHERE notification_templates ? 'event_update';