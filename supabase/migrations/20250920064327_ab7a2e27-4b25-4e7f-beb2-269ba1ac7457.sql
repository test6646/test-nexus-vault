-- Fix the videographer to cinematographer conversion with proper dependency handling

-- Step 1: Update all existing 'Videographer' records to 'Cinematographer' first
UPDATE profiles 
SET role = 'Cinematographer'
WHERE role = 'Videographer';

UPDATE freelancers 
SET role = 'Cinematographer' 
WHERE role = 'Videographer';

-- Step 2: Convert role columns to text temporarily
ALTER TABLE profiles ALTER COLUMN role TYPE text;
ALTER TABLE freelancers ALTER COLUMN role TYPE text;

-- Step 3: Drop the function that depends on user_role
DROP FUNCTION IF EXISTS get_current_user_role();

-- Step 4: Drop the old enum (now that columns are text)
DROP TYPE user_role;

-- Step 5: Create new enum without Videographer
CREATE TYPE user_role AS ENUM (
  'Admin',
  'Photographer', 
  'Cinematographer',
  'Editor',
  'Drone Pilot',
  'Other'
);

-- Step 6: Convert columns back to use the new enum
ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING role::user_role;
ALTER TABLE freelancers ALTER COLUMN role TYPE user_role USING role::user_role;

-- Step 7: Recreate the get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;