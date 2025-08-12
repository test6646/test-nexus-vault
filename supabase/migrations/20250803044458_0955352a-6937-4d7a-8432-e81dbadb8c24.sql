-- Add a freelancer_id column to tasks table for freelancer assignments
ALTER TABLE public.tasks ADD COLUMN freelancer_id UUID REFERENCES public.freelancers(id);

-- Update the foreign key constraint name for assigned_to to be more specific  
-- (This will help us distinguish between staff and freelancer assignments)