-- Remove all duplicate foreign key constraints on tasks table
-- Keep only the standardized constraint names expected by PostgREST

-- Remove duplicate created_by constraint
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS fk_tasks_created_by;

-- Remove duplicate firm_id constraint  
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS fk_tasks_firm_id;

-- Check and list all constraints on tasks table to see what remains
SELECT conname, contype, pg_get_constraintdef(oid) as definition 
FROM pg_constraint 
WHERE conrelid = 'public.tasks'::regclass;