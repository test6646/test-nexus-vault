-- Remove duplicate foreign keys I created since the original ones already exist
ALTER TABLE events DROP CONSTRAINT IF EXISTS fk_events_photographer;
ALTER TABLE events DROP CONSTRAINT IF EXISTS fk_events_cinematographer;
ALTER TABLE events DROP CONSTRAINT IF EXISTS fk_events_drone_pilot;
ALTER TABLE events DROP CONSTRAINT IF EXISTS fk_events_editor;
ALTER TABLE events DROP CONSTRAINT IF EXISTS fk_events_same_day_editor;

-- Remove duplicate event_staff_assignments foreign keys
ALTER TABLE event_staff_assignments DROP CONSTRAINT IF EXISTS fk_event_staff_assignments_event;
ALTER TABLE event_staff_assignments DROP CONSTRAINT IF EXISTS fk_event_staff_assignments_staff;