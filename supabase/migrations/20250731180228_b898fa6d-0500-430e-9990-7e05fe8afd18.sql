-- Update the user_role enum to remove 'Videographer' role
-- First, update any existing profiles that still have 'Videographer' role to 'Cinematographer'
UPDATE public.profiles 
SET role = 'Cinematographer' 
WHERE role = 'Videographer';

-- Drop and recreate the enum type with the updated values
DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('Admin', 'Photographer', 'Cinematographer', 'Editor', 'Drone Pilot', 'Other');

-- Re-add the role column constraint to the profiles table
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE public.user_role 
USING role::text::public.user_role;