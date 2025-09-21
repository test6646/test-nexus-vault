-- Update existing Videographer roles to Cinematographer
UPDATE profiles 
SET role = 'Cinematographer'::user_role 
WHERE role = 'Videographer'::user_role;