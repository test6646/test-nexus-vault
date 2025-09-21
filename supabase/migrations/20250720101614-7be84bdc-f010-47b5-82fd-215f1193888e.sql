-- Add foreign key constraints to event_staff_assignments table to properly link with other tables
ALTER TABLE public.event_staff_assignments 
ADD CONSTRAINT fk_event_staff_assignments_event_id 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.event_staff_assignments 
ADD CONSTRAINT fk_event_staff_assignments_staff_id 
FOREIGN KEY (staff_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.event_staff_assignments 
ADD CONSTRAINT fk_event_staff_assignments_firm_id 
FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE;