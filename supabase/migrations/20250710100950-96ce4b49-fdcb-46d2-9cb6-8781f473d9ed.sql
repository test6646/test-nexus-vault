-- Add back the foreign key constraint with the exact name that Supabase PostgREST expects

-- Drop existing constraint and recreate with correct name for tasks-events relationship
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS fk_tasks_event_id;
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;