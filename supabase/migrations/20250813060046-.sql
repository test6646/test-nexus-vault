-- Add CASCADE DELETE for payments when events are deleted
-- This ensures when an event is deleted, all related payments are also deleted

-- First, check if foreign key exists and drop it if it does
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'payments_event_id_fkey' 
        AND table_name = 'payments'
    ) THEN
        ALTER TABLE payments DROP CONSTRAINT payments_event_id_fkey;
    END IF;
END $$;

-- Add the foreign key with CASCADE DELETE
ALTER TABLE payments 
ADD CONSTRAINT payments_event_id_fkey 
FOREIGN KEY (event_id) 
REFERENCES events(id) 
ON DELETE CASCADE;