-- Add calendar_event_id column to events table
ALTER TABLE public.events 
ADD COLUMN calendar_event_id TEXT;