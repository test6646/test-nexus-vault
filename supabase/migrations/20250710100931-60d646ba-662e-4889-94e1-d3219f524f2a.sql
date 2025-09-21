-- Add back the foreign key constraints with the exact names that Supabase PostgREST expects

-- Drop existing constraint and recreate with correct name for tasks-events relationship
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS fk_tasks_event_id;
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Add missing constraint for firm_members-profiles relationship
-- (This was also mentioned in the error logs)
ALTER TABLE public.firm_members 
ADD CONSTRAINT firm_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;