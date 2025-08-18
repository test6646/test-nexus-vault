-- Drop the old foreign key constraint
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_videographer_id_fkey;

-- Add the new foreign key constraint with the correct name
ALTER TABLE public.events 
ADD CONSTRAINT events_cinematographer_id_fkey 
FOREIGN KEY (cinematographer_id) REFERENCES public.profiles(id);