
-- Update the event_type enum to use the correct 5 types specified by the user
-- First, update any existing records to map to the new types
UPDATE events 
SET event_type = 'Product'::event_type 
WHERE event_type IN ('Corporate'::event_type, 'Birthday'::event_type);

UPDATE quotations 
SET event_type = 'Product'::event_type 
WHERE event_type IN ('Corporate'::event_type, 'Birthday'::event_type);

-- Now recreate the enum with the correct 5 types
ALTER TYPE event_type RENAME TO event_type_old;

CREATE TYPE event_type AS ENUM ('Ring-Ceremony', 'Pre-Wedding', 'Wedding', 'Maternity Photography', 'Others');

-- Update the events table to use the new enum, mapping old values to new ones
ALTER TABLE events 
ALTER COLUMN event_type TYPE event_type USING 
  CASE 
    WHEN event_type::text = 'Pre-Wedding' THEN 'Pre-Wedding'::event_type
    WHEN event_type::text = 'Wedding' THEN 'Wedding'::event_type
    ELSE 'Others'::event_type
  END;

-- Update quotations table with the same mapping
ALTER TABLE quotations 
ALTER COLUMN event_type TYPE event_type USING 
  CASE 
    WHEN event_type::text = 'Pre-Wedding' THEN 'Pre-Wedding'::event_type
    WHEN event_type::text = 'Wedding' THEN 'Wedding'::event_type
    ELSE 'Others'::event_type
  END;

-- Drop the old enum type
DROP TYPE event_type_old;
