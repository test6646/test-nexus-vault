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