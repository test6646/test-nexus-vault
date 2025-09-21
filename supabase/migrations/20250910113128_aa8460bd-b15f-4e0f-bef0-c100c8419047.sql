-- Add default post-production rates to firms table
ALTER TABLE public.firms 
ADD COLUMN default_postproduction_rates jsonb DEFAULT '{"package_35k": 35000, "package_45k": 45000}'::jsonb;