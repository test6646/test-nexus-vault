-- Add drone_pilot_id column to events table
ALTER TABLE events 
ADD COLUMN drone_pilot_id uuid;

-- Create a security definer function to get user role safely
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS TEXT AS $$
  SELECT role::text FROM public.profiles WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop the policy that depends on role column
DROP POLICY IF EXISTS "Admins can create firms" ON public.firms;

-- Update user role enum
ALTER TYPE user_role RENAME TO user_role_old;
CREATE TYPE user_role AS ENUM ('Admin', 'Photographer', 'Cinematographer', 'Editor', 'Drone Pilot', 'Other');

-- Update profiles table to use new enum
ALTER TABLE profiles 
ALTER COLUMN role DROP DEFAULT,
ALTER COLUMN role TYPE user_role USING 
  CASE role::text 
    WHEN 'Videographer' THEN 'Cinematographer'::user_role
    ELSE role::text::user_role 
  END,
ALTER COLUMN role SET DEFAULT 'Other'::user_role;

-- Drop old enum
DROP TYPE user_role_old;

-- Recreate the policy using the security definer function
CREATE POLICY "Admins can create firms" ON public.firms
FOR INSERT 
WITH CHECK (
  public.get_user_role(auth.uid()) = 'Admin' OR created_by = auth.uid()
);

-- Insert Bhavesh Patel as drone pilot if not exists
INSERT INTO profiles (user_id, full_name, mobile_number, role, firm_id, current_firm_id)
SELECT 
  gen_random_uuid(),
  'Bhavesh Patel',
  '9999999999',
  'Drone Pilot'::user_role,
  NULL,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE full_name = 'Bhavesh Patel' AND role = 'Drone Pilot'
);