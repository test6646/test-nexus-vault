-- Update existing events to set photographer_id and videographer_id from staff assignments
UPDATE events 
SET photographer_id = (
  SELECT esa.staff_id 
  FROM event_staff_assignments esa 
  WHERE esa.event_id = events.id 
  AND esa.role = 'Photographer' 
  AND esa.day_number = 1 
  LIMIT 1
),
videographer_id = (
  SELECT esa.staff_id 
  FROM event_staff_assignments esa 
  WHERE esa.event_id = events.id 
  AND esa.role = 'Videographer' 
  AND esa.day_number = 1 
  LIMIT 1
)
WHERE (photographer_id IS NULL OR videographer_id IS NULL)
AND EXISTS (
  SELECT 1 FROM event_staff_assignments esa 
  WHERE esa.event_id = events.id 
  AND esa.role IN ('Photographer', 'Videographer')
);