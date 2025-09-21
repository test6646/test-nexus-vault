-- Add drone_pilot_id column to events table
ALTER TABLE events 
ADD COLUMN drone_pilot_id uuid;

-- Add new role values to existing enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Cinematographer';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Drone Pilot';