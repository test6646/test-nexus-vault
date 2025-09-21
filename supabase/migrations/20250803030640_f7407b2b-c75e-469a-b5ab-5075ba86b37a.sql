-- Remove the problematic foreign key constraint for same_day_editor_id
-- This constraint references a table that doesn't exist
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_same_day_editor_id_fkey;

-- Also ensure the same_day_editor_id column allows NULL values
ALTER TABLE events ALTER COLUMN same_day_editor_id DROP NOT NULL;