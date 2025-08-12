-- Update existing Videographer roles to Cinematographer
UPDATE profiles 
SET role = 'Cinematographer'::user_role 
WHERE role = 'Videographer'::user_role;

-- Insert Bhavesh Patel as drone pilot if not exists with a valid firm ID
DO $$
DECLARE
  first_firm_id uuid;
BEGIN
  -- Get the first available firm ID
  SELECT id INTO first_firm_id FROM firms LIMIT 1;
  
  IF first_firm_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE full_name = 'Bhavesh Patel' AND role = 'Drone Pilot'
  ) THEN
    INSERT INTO profiles (user_id, full_name, mobile_number, role, firm_id, current_firm_id)
    VALUES (
      gen_random_uuid(),
      'Bhavesh Patel',
      '9999999999',
      'Drone Pilot'::user_role,
      first_firm_id,
      first_firm_id
    );
  END IF;
END $$;