-- Remove duplicate foreign key constraint on tasks.assigned_to
-- Keep only the standardized constraint name expected by PostgREST
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS fk_tasks_assigned_to;

-- The tasks_assigned_to_fkey constraint should remain as it's the standard naming convention