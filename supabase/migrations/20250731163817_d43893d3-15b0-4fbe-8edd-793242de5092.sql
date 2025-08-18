-- Add drone_pilot_id column to events table
ALTER TABLE events 
ADD COLUMN drone_pilot_id uuid;

-- Add new role values to existing enum
ALTER TYPE user_role ADD VALUE 'Cinematographer';
ALTER TYPE user_role ADD VALUE 'Drone Pilot';

-- Update existing Videographer roles to Cinematographer
UPDATE profiles 
SET role = 'Cinematographer'::user_role 
WHERE role = 'Videographer'::user_role;

-- Insert Bhavesh Patel as drone pilot if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE full_name = 'Bhavesh Patel' AND role = 'Drone Pilot'
  ) THEN
    INSERT INTO profiles (user_id, full_name, mobile_number, role, firm_id, current_firm_id)
    VALUES (
      gen_random_uuid(),
      'Bhavesh Patel',
      '9999999999',
      'Drone Pilot'::user_role,
      NULL,
      NULL
    );
  END IF;
END $$;