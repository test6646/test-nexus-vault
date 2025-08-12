-- First, get all the current user_role values to see what we're working with
-- Update any existing profiles that still have 'Videographer' role to 'Cinematographer'
UPDATE public.profiles 
SET role = 'Cinematographer'::public.user_role 
WHERE role = 'Videographer'::public.user_role;