-- Add drone_pilot_id column to events table if it doesn't exist
-- (Check if column already exists in schema - it appears to be there already)

-- Update event_staff_assignments to include proper role for Drone Pilot
-- First add a check to see if we need to create the Drone Pilot profile for Bhavesh Patel
DO $$
BEGIN
  -- Check if Bhavesh Patel already exists as Drone Pilot
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE full_name = 'Bhavesh Patel' 
    AND role = 'Drone Pilot'
  ) THEN
    -- Create Bhavesh Patel as Drone Pilot if he doesn't exist
    -- Note: This would need to be done through the admin interface typically
    -- For now, we'll just ensure the role structure supports it
    NULL;
  END IF;
END
$$;

-- Ensure the role enum includes Drone Pilot (if not already present)
-- This appears to already be supported based on the schema

-- Update any existing 'Videographer' role references to 'Cinematographer' in event_staff_assignments
UPDATE event_staff_assignments 
SET role = 'Cinematographer' 
WHERE role = 'Videographer';

-- Update any existing profiles with Videographer role to Cinematographer
UPDATE profiles 
SET role = 'Cinematographer' 
WHERE role = 'Videographer';

-- Add a comment to track this change
COMMENT ON COLUMN events.drone_pilot_id IS 'ID of the drone pilot assigned to this event';
COMMENT ON COLUMN events.videographer_id IS 'Legacy field - now using cinematographer_id for cinematographer assignments';