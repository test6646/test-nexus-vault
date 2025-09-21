-- Fix the payments table relationship and ensure cascade delete
-- First, check if foreign key exists and add/modify if needed

-- Drop existing foreign key if it exists
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_event_id_fkey;

-- Add proper foreign key with cascade delete
ALTER TABLE payments 
ADD CONSTRAINT payments_event_id_fkey 
FOREIGN KEY (event_id) 
REFERENCES events(id) 
ON DELETE CASCADE;