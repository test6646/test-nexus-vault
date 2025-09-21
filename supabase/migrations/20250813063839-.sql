-- Remove the duplicate foreign key constraint to fix relationship conflicts
-- Both constraints are identical, so we'll keep the standard Supabase naming convention
-- and remove the custom named one

ALTER TABLE public.event_staff_assignments 
DROP CONSTRAINT IF EXISTS fk_event_staff_assignments_event_id;

-- Verify we still have the correct constraint
-- The remaining constraint: event_staff_assignments_event_id_fkey should be sufficient