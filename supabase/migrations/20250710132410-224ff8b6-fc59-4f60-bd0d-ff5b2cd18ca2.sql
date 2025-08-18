-- Fix the foreign key relationship between firm_members and profiles
-- Add foreign key constraint to link firm_members to profiles via user_id
ALTER TABLE public.firm_members 
ADD CONSTRAINT fk_firm_members_user_profile 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;