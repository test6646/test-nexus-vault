-- Add CASCADE DELETE for event_staff_assignments when events are deleted
-- Add CASCADE DELETE for event_assignment_rates when events are deleted
-- These ensure when an event is deleted, all related staff assignments and rates are also deleted

-- First, check and drop existing foreign keys for event_staff_assignments
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'event_staff_assignments_event_id_fkey' 
        AND table_name = 'event_staff_assignments'
    ) THEN
        ALTER TABLE event_staff_assignments DROP CONSTRAINT event_staff_assignments_event_id_fkey;
    END IF;
END $$;

-- Add the foreign key with CASCADE DELETE for event_staff_assignments
ALTER TABLE event_staff_assignments 
ADD CONSTRAINT event_staff_assignments_event_id_fkey 
FOREIGN KEY (event_id) 
REFERENCES events(id) 
ON DELETE CASCADE;

-- Check and drop existing foreign keys for event_assignment_rates
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'event_assignment_rates_event_id_fkey' 
        AND table_name = 'event_assignment_rates'
    ) THEN
        ALTER TABLE event_assignment_rates DROP CONSTRAINT event_assignment_rates_event_id_fkey;
    END IF;
END $$;

-- Add the foreign key with CASCADE DELETE for event_assignment_rates
ALTER TABLE event_assignment_rates 
ADD CONSTRAINT event_assignment_rates_event_id_fkey 
FOREIGN KEY (event_id) 
REFERENCES events(id) 
ON DELETE CASCADE;