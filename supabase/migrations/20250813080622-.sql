-- Add current_firm_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'current_firm_id') THEN
        ALTER TABLE public.profiles ADD COLUMN current_firm_id uuid;
    END IF;
END $$;

-- Update current_firm_id for existing profiles
-- Only set current_firm_id = firm_id for non-admin users or admins who have a firm_id
UPDATE public.profiles 
SET current_firm_id = firm_id 
WHERE current_firm_id IS NULL 
  AND (role != 'Admin' OR (role = 'Admin' AND firm_id IS NOT NULL));