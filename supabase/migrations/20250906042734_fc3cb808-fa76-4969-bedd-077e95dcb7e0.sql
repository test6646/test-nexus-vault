-- Fix the user profile creation trigger
-- The issue is the trigger is trying to process on signup before email confirmation
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  profile_firm_id UUID;
BEGIN
  -- Extract firm_id from user metadata
  profile_firm_id := (NEW.raw_user_meta_data ->> 'firm_id')::UUID;
  
  -- Insert profile with firm_id from metadata
  INSERT INTO public.profiles (
    user_id,
    full_name,
    mobile_number,
    role,
    firm_id,
    current_firm_id
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Unknown User'),
    COALESCE(NEW.raw_user_meta_data ->> 'mobile_number', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'Admin'::user_role),
    profile_firm_id,
    profile_firm_id
  );

  -- If user is joining an existing firm (has firm_id but didn't create the firm), add them as member
  IF profile_firm_id IS NOT NULL THEN
    -- Check if user is NOT the creator of this firm
    IF NOT EXISTS (
      SELECT 1 FROM firms 
      WHERE id = profile_firm_id AND created_by = NEW.id
    ) THEN
      -- Add as firm member with Admin role (since they're signing up as Admin)
      INSERT INTO public.firm_members (
        firm_id,
        user_id,
        role
      ) VALUES (
        profile_firm_id,
        NEW.id,
        'Admin'
      ) ON CONFLICT (firm_id, user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger to run immediately on user creation (not waiting for email confirmation)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();