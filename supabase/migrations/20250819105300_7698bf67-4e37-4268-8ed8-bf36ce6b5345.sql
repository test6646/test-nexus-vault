-- Update any existing 'Editor' role assignments to 'Same Day Editor'
-- This is necessary because same day editors were incorrectly saved with role 'Editor'

UPDATE event_staff_assignments 
SET role = 'Same Day Editor' 
WHERE role = 'Editor' 
  AND day_number = 1;

-- Add a comment for future reference
COMMENT ON COLUMN event_staff_assignments.role IS 'Role of the staff member in this assignment. Same day editors should use "Same Day Editor" role.';