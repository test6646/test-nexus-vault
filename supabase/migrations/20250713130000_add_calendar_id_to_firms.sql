
-- Add calendar_id column to firms table
ALTER TABLE firms ADD COLUMN calendar_id TEXT;

-- Add comment for clarity
COMMENT ON COLUMN firms.calendar_id IS 'Google Calendar ID for this firm';
