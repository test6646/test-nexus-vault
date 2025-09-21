-- Clean up any remaining editor_id columns from old migrations
-- This ensures the database structure matches the code

-- Remove editor_id column if it exists in events table
ALTER TABLE public.events 
DROP COLUMN IF EXISTS editor_id;

-- Remove same_day_editor_id column if it exists (replaced by same_day_editor boolean)
ALTER TABLE public.events 
DROP COLUMN IF EXISTS same_day_editor_id;

-- Ensure we have the correct same_day_editor boolean column
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS same_day_editor boolean DEFAULT false;