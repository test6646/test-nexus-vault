-- Fix foreign key relationships between events and profiles
-- Add foreign key constraints for photographer_id, cinematographer_id, drone_pilot_id, and editor_id

ALTER TABLE events 
ADD CONSTRAINT fk_events_photographer 
FOREIGN KEY (photographer_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE events 
ADD CONSTRAINT fk_events_cinematographer 
FOREIGN KEY (cinematographer_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE events 
ADD CONSTRAINT fk_events_drone_pilot 
FOREIGN KEY (drone_pilot_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE events 
ADD CONSTRAINT fk_events_editor 
FOREIGN KEY (editor_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE events 
ADD CONSTRAINT fk_events_same_day_editor 
FOREIGN KEY (same_day_editor_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Also add foreign key for event_staff_assignments
ALTER TABLE event_staff_assignments 
ADD CONSTRAINT fk_event_staff_assignments_event 
FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE event_staff_assignments 
ADD CONSTRAINT fk_event_staff_assignments_staff 
FOREIGN KEY (staff_id) REFERENCES profiles(id) ON DELETE CASCADE;